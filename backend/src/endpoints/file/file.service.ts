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

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { extname } from 'path';
import { lookup as lookupMime } from 'mime-types';

@Injectable()
export class FileService {
  async fileUpload(file, folderName: string): Promise<any> {

    // Generate a unique suffix for the file key
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    // Initialize the S3 client with your IONOS S3 credentials
    const s3 = new S3({
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      endpoint: process.env.S3_URL, 
      correctClockSkew: true,
    });

    const bucketName = process.env.S3_BUCKET;

    // Generate the key using the unique suffix and original file extension
    const key = file.fieldname + '-' + uniqueSuffix + extname(file.originalname);

    // Upload the file to IONOS S3
    const s3UploadParams = {
      Body: file.buffer,
      Bucket: bucketName,
      Key: key,
    };
    try {
      const response = await s3.upload(s3UploadParams).promise();
      return response.Location;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err) {
        throw new HttpException(err || err, HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException(err, HttpStatus.NOT_FOUND);
      }
    }
  }

  private getContentType(fileName: string): string {
    const type = (lookupMime(fileName) || '').toString().toLowerCase();
    if (type.startsWith('image/') || type === 'application/pdf') return type;
    return 'application/octet-stream';
  }

  async getFileByName(fileName: string): Promise<{ file: Buffer; contentType: string }> {
    const s3 = new S3({
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      endpoint: process.env.S3_URL, 
      correctClockSkew: true,
    });

    const bucketName = process.env.S3_BUCKET;

    try {
      const data = await s3.getObject({
        Bucket: bucketName,
        Key: fileName
      }).promise();

      if (!data.Body) {
        throw new HttpException("File found but body is empty", HttpStatus.NOT_FOUND);
      }

      // Determine content type based on file extension
      const contentType = this.getContentType(fileName);

      return {
        file: data.Body as Buffer,
        contentType,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err) {
        throw new HttpException(err || err, HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException(err || err, HttpStatus.NOT_FOUND);
      }
    }
  }
}
