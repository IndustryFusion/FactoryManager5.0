import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Req, Res, Session, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { getCronToken } from '../session/session.service';
import { CronService } from './cron.service';

@Controller('cron')
export class CronController {
    constructor(private readonly cronService: CronService) {}

    @Get()
    async validate(@Req() req: Request) {
        console.log('inside validate')
        try {
            const token = await getCronToken(req);
            return this.cronService.validateScript(token);
        } catch (err) {
            throw new NotFoundException("Error fetching assets " + err);
        }
    }
}