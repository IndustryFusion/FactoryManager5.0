import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { Multer } from 'multer';

@Injectable()
export class FlinkDeployService {
  /**
   * Picks knowledge.ttl (or konwledge.ttl) and shacl.ttl,
   * ensures they exist in targetDir, then runs `make` in that folder.
   */
  async processAndRun(files: Multer.File[], targetDir: string) {
    // Map uploaded files by name (case-insensitive)
    const byName = new Map(
      files.map((f) => [f.originalname.toLowerCase(), f]),
    );

    // Allow common typo "konwledge.ttl"
    const knowledge = byName.get('knowledge.ttl') ?? byName.get('knowledge.ttl');
    const shacl = byName.get('shacl.ttl');

    if (!knowledge || !shacl) {
      throw new BadRequestException(
        'Missing required files: knowledge.ttl (or konwledge.ttl) and shacl.ttl',
      );
    }

    // Sanity check that they landed in targetDir (multer already saved them)
    [knowledge, shacl].forEach((f) => {
      if (!f.path.startsWith(targetDir)) {
        throw new BadRequestException('Uploaded file location invalid');
      }
      if (!fs.existsSync(f.path)) {
        throw new BadRequestException(`File not found on disk: ${f.originalname}`);
      }
    });

    // (Optional) If you need to rename/normalize the typo to knowledge.ttl:
    if (!fs.existsSync(path.join(targetDir, 'knowledge.ttl'))) {
      fs.copyFileSync(knowledge.path, path.join(targetDir, 'knowledge.ttl'));
    }
    if (!fs.existsSync(path.join(targetDir, 'shacl.ttl'))) {
      fs.copyFileSync(shacl.path, path.join(targetDir, 'shacl.ttl'));
    }

    // Run your Make targets against this folder
    // Examples: ["validate"], ["prepare", "validate"], or just [] for default target
    const makeOutput = await this.runMake(targetDir, []);

    return {
      files: files.map((f) => ({ name: f.originalname, savedAs: f.path })),
      make: makeOutput,
    };
  }

  private runMake(
    cwd: string,
    targets: string[] = [],
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const args = ['-C', cwd, ...targets];
      const child = spawn('make', args, { cwd });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('error', (err) => reject(err));
      child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    });
  }
}
