// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors, Logger, Res, BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { extname } from 'path';
import { Response } from 'express';

@Controller('file')
export class FileController {
  private logger = new Logger(FileController.name);
  static readonly ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];
  constructor(private readonly fileService: FileService) { }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        if (!FileController.ALLOWED_EXTENSIONS.includes(ext)) {
          // Must be an HttpException, not a bare Error: a plain Error bypasses
          // the exception filter and reaches the browser as an opaque 500,
          // hiding the very message that explains what went wrong.
          return cb(
            new UnsupportedMediaTypeException(
              `${ext ? `"${ext}" files are not supported.` : 'This file type is not supported.'} Allowed formats: ${FileController.ALLOWED_EXTENSIONS.join(', ')}.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 1024 * 1024 * 10 },
    }),
  )
  async fileUpload(@UploadedFile() file) {
    try {
      // multer leaves this undefined when no part named "file" was sent.
      if (!file?.buffer) {
        throw new BadRequestException('No file was uploaded.');
      }
      return await this.fileService.fileUpload({
        ...file
      }, 'image');
    } catch (err) {
      this.logger.error('Failed to Upload File ', err);
      throw err;
    }
  }

  @Get('by-name/:fileName')
  async getFileByName(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const { file, contentType } = await this.fileService.getFileByName(fileName);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.send(file);
    } catch (err) {
      this.logger.error('Failed to Retrieve File by Name', err);
      throw err;
    }
  }

}
