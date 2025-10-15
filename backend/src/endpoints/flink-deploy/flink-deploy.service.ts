import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import axios from 'axios';
import { FlinkJob } from '../schemas/flink-job.schema';
import { JobStatus } from '../schemas/flink-job.schema';
import { FlinkJobDto } from './dto/flink-job.dto';
import * as Multer from 'multer';
import { FileService } from '../file/file.service';
import { createParser } from 'eventsource-parser';

@Injectable()
export class FlinkDeployService {
  private readonly logger = new Logger(FlinkDeployService.name);
  private readonly pollers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(FlinkJob.name) private readonly jobModel: Model<FlinkJob>,
    private readonly fileService: FileService,
  ) { }

  async createJobAndUpload(
    files: { knowledge: Multer.File; shacl: Multer.File },
    dto: FlinkJobDto,
  ) {
    const jobId = randomUUID();

    const knowledgeUrl = await this.fileService.fileUpload(files.knowledge, "");
    const shaclUrl = await this.fileService.fileUpload(files.shacl, "");

    const job = await this.jobModel.create({
      jobId,
      status: JobStatus.QUEUED,
      knowledgeUrl: knowledgeUrl,
      shaclUrl: shaclUrl,
      target: dto?.target ?? 'deploy',
      runnerPayload: dto?.runnerContext ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { job, jobId, knowledgeUrl, shaclUrl };
  }

  /**
   * Dummy call to Python Runner. Replace RUNNER_URL with your endpoint.
   * Returns the runner's jobId (or echoes ours).
   */
  async triggerRunner(job: FlinkJob, urls: { knowledgeGetUrl: string; shaclGetUrl: string }) {
    const RUNNER_URL = process.env.RUNNER_URL || 'http://runner:8080';
    try {
      const payload = {
        jobId: job.jobId,
        target: job.target ?? 'deploy',
        urls: {
          knowledge: urls.knowledgeGetUrl,
          shacl: urls.shaclGetUrl,
        },
        context: job.runnerPayload ?? {},
      };

      const res = await axios.post(`${RUNNER_URL}/jobs`, payload, {
        timeout: 60_000,
        headers: { Authorization: `Bearer ${process.env.RUNNER_TOKEN ?? ''}` },
      });

      const returnedJobId = res.data?.jobId ?? job.jobId;

      await this.jobModel.updateOne(
        { _id: job._id },
        { $set: { runnerResponse: JSON.stringify(res.data ?? {}), status: JobStatus.QUEUED, updatedAt: new Date() } },
      );

      this.startStatusPoller(returnedJobId);

      return returnedJobId;
    } catch (err: any) {
      this.logger.error('Runner call failed', err?.response?.data ?? err?.message);
      await this.jobModel.updateOne(
        { _id: job._id },
        { $set: { status: JobStatus.FAILED, runnerResponse: err?.message } },
      );
      throw new InternalServerErrorException('Failed to trigger runner');
    }
  }

  // === Streaming logs (proxy Runner SSE to client) ===
  async pipeRunnerSseToResponse(jobId: string, res: import('express').Response) {
    const RUNNER_URL = process.env.RUNNER_URL || 'http://runner:8080';
    const url = `${RUNNER_URL}/jobs/${jobId}/logs`; // Runner should expose SSE here

    // SSE response headers for the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const ctrl = new AbortController();
    const signal = ctrl.signal;

    // Clean up when client disconnects
    reqOnClose(res, () => ctrl.abort());

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${process.env.RUNNER_TOKEN ?? ''}` },
        signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Runner SSE error: ${resp.status} ${resp.statusText}`);
      }

      const parser = createParser({
        onEvent: (evt) => {
          if (evt.event !== undefined) {
            // Pass through event name and data
            res.write(`event: ${evt.event || 'message'}\n`);
            res.write(`data: ${evt.data}\n\n`);
          }
        }
      });

      for await (const chunk of streamChunks(resp.body)) {
        parser.feed(chunk);
      }
    } catch (e: any) {
      this.logger.error(`SSE proxy failed for ${jobId}: ${e?.message}`);
      // Send an error event, then end
      res.write(`event: error\ndata: ${JSON.stringify({ message: e?.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  // === Per-job status poller ===
  startStatusPoller(jobId: string, intervalMs = 5000) {
    if (this.pollers.has(jobId)) return; // already polling

    const RUNNER_URL = process.env.RUNNER_URL || 'http://runner:8080';
    const tick = async () => {
      try {
        const job = await this.jobModel.findOne({ jobId });
        if (!job) return this.stopStatusPoller(jobId);

        const { data } = await axios.get(`${RUNNER_URL}/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${process.env.RUNNER_TOKEN ?? ''}` },
          timeout: 15_000,
        });

        const runnerStatus: string = (data?.status || '').toUpperCase();
        const mapped = mapRunnerStatus(runnerStatus);

        if (mapped && job.status !== mapped) {
          await this.jobModel.updateOne({ _id: job._id }, { $set: { status: mapped, updatedAt: new Date() } });
        }

        if (mapped === JobStatus.SUCCEEDED || mapped === JobStatus.FAILED) {
          this.stopStatusPoller(jobId);
        }
      } catch (err: any) {
        // Keep polling; optionally mark FAILED after repeated errors
        this.logger.warn(`Poll ${jobId} warn: ${err?.message}`);
      }
    };

    const t = setInterval(tick, intervalMs);
    this.pollers.set(jobId, t);
    // kick immediately (no initial delay)
    tick();
  }

  stopStatusPoller(jobId: string) {
    const t = this.pollers.get(jobId);
    if (t) {
      clearInterval(t);
      this.pollers.delete(jobId);
    }
  }
}

/** Helpers **/

function reqOnClose(res: import('express').Response, cb: () => void) {
  const req = (res as any).req as import('express').Request;
  const clean = () => {
    req.off?.('close', clean);
    req.off?.('finish', clean);
    cb();
  };
  req.on?.('close', clean);
  req.on?.('finish', clean);
}

async function* streamChunks(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) yield new TextDecoder().decode(value);
    }
  } finally {
    reader.releaseLock();
  }
}

function mapRunnerStatus(runner: string): JobStatus | null {
  switch (runner) {
    case 'QUEUED':
    case 'PENDING':
      return JobStatus.QUEUED;
    case 'RUNNING':
    case 'IN_PROGRESS':
      return JobStatus.RUNNING;
    case 'SUCCEEDED':
    case 'SUCCESS':
    case 'COMPLETED':
      return JobStatus.SUCCEEDED;
    case 'FAILED':
    case 'ERROR':
      return JobStatus.FAILED;
    default:
      return null;
  }
}
