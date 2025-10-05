import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { FlinkDeployService } from './flink-deploy.service';
import type { Multer } from 'multer';

const SCRIPTS_BASE =
    process.env.SCRIPTS_BASE_DIR ?? path.join(process.cwd(), 'scripts');

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

@Controller('flink-deploy')
export class FlinkDeployController {
    constructor(private readonly flinkDeploySvc: FlinkDeployService) { }

    @Post()
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const reqId =
                        (req as any).reqId ??
                        ((req as any).reqId = randomUUID().slice(0, 8));
                    const dest = path.join(SCRIPTS_BASE, 'kms', reqId);
                    try {
                        ensureDir(dest);
                        cb(null, dest);
                    } catch (e) {
                        cb(e as Error, dest);
                    }
                },
                filename: (_req, file, cb) => {
                    // Keep original name; overwrite if same filename is uploaded twice
                    cb(null, file.originalname);
                },
            }),
            fileFilter: (_req, file, cb) => {
                // accept only .ttl files (you can relax this if needed)
                if (file.originalname.toLowerCase().endsWith('.ttl')) return cb(null, true);
                return cb(new BadRequestException('Only .ttl files are allowed'), false);
            },
            limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
        }),
    )
    async uploadMultiple(@UploadedFiles() files: Multer.File[]) {
        if (!files?.length) {
            throw new BadRequestException('No files uploaded (expecting field: files)');
        }

        // All files share the same destination; pick from the first
        const targetDir = path.dirname(files[0].path);

        // Hand off to service (also returns make output)
        const result = await this.flinkDeploySvc.processAndRun(files, targetDir);

        return {
            message: 'Files received and processed',
            targetDir,
            result,
        };
    }
}
