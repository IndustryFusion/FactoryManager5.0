import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  Get,
  Param,
  Res,
  NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer'; // not used for memory; see storage below
import { FlinkDeployService } from './flink-deploy.service';
import { FlinkJobDto } from './dto/flink-job.dto';
import * as Multer from 'multer';
import { InjectModel } from '@nestjs/mongoose';
import { FlinkJob } from '../schemas/flink-job.schema';
import { Model } from 'mongoose';

// Multer: keep files in memory and filter for .ttl
const multerOptions = {
  storage: undefined, // memory storage by default in Nest if undefined
  fileFilter: (_req: any, file: Multer.File, cb: Function) => {
    const ok =
      file.mimetype === 'text/turtle' ||
      file.originalname.toLowerCase().endsWith('.ttl');
    if (!ok) return cb(new Error('Only .ttl (Turtle) files are allowed'), false);
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB each
  },
};

@Controller('jobs')
export class FlinkDeployController {
  constructor(private readonly flinkDeployService: FlinkDeployService, @InjectModel(FlinkJob.name) private readonly jobModel: Model<FlinkJob>) {}

  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'knowledge', maxCount: 1 },
        { name: 'shacl', maxCount: 1 },
      ],
      multerOptions as any,
    ),
  )
  async createJob(
    @UploadedFiles()
    files: {
      knowledge?: Multer.File[];
      shacl?: Multer.File[];
    }
  ) {
    const knowledge = files?.knowledge?.[0];
    const shacl = files?.shacl?.[0];

    if (!knowledge || !shacl) {
      throw new Error('Both knowledge and shacl files are required');
    }

    // 1) Upload & persist QUEUED job
    const { job, jobId, knowledgeUrl, shaclUrl } =
      await this.flinkDeployService.createJobAndUpload({ knowledge, shacl });

    // 2) Trigger runner (dummy call) — non-blocking is also OK if you prefer
    const returnedJobId = await this.flinkDeployService.triggerRunner(job, {
      knowledgeGetUrl: knowledgeUrl,
      shaclGetUrl: shaclUrl,
    });

    return {
      jobId: returnedJobId,
      status: 'QUEUED',
      knowledgeUrl: job.knowledgeUrl,
      shaclUrl: job.shaclUrl,
    };
  }


  // 1) Stream logs (SSE proxy)
  @Get(':id/stream')
  async stream(@Param('id') jobId: string, @Res() res: Response) {
    const job = await this.jobModel.findOne({ jobId });
    if (!job) throw new NotFoundException('Job not found');
    await this.flinkDeployService.pipeRunnerSseToResponse(jobId, res);
  }

  // 2) Read job status (simple status endpoint for UI)
  @Get(':id')
  async getJob(@Param('id') jobId: string) {
    const job = await this.jobModel.findOne({ jobId }).lean();
    if (!job) throw new NotFoundException('Job not found');
    return {
      jobId: job.jobId,
      status: job.status,
      knowledgeUrl: job.knowledgeUrl,
      shaclUrl: job.shaclUrl,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
