import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Req, Res, Session, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { getSessionToken } from '../session/session.service';
import { CronService } from './cron.service';

@Controller('cron')
export class CronController {
    constructor(private readonly cronService: CronService) {}

    @Get()
    async validate(@Req() req: Request) {
        console.log('inside validate')
        try {
            // const token = await getSessionToken(req);
            const token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJQR1ItRmpRRVNfa1plMk5UQXFHd0N1dnRTY2hxUmlDZUlxZTkxZlRJSnBvIn0.eyJleHAiOjE3MzgwNjM0ODIsImlhdCI6MTcwNjUyNzQ4MiwianRpIjoiYWZlMTY3MzAtMzUxMS00ZGE2LWIyOWMtODU5MWQ1ZjU5ZDFhIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wbWVudC5pbmR1c3RyeS1mdXNpb24uY29tL2F1dGgvcmVhbG1zL2lmZiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjMWViNzg2My0zZWJlLTQ5NGUtYmJhOS01ZTY3YjZiYzI4MTciLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzY29ycGlvIiwic2Vzc2lvbl9zdGF0ZSI6IjIyMWYxOTBhLTE0YjAtNDY3Mi1iYzMwLTEyMTA0MWZiNTFmYSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlmZiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJzY29ycGlvIjp7InJvbGVzIjpbIkZhY3RvcnktQWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicGdyZXN0X3JvbGUgZW1haWwgZmFjdG9yeS1hZG1pbiBvZmZsaW5lX2FjY2VzcyBwcm9maWxlIiwic2lkIjoiMjIxZjE5MGEtMTRiMC00NjcyLWJjMzAtMTIxMDQxZmI1MWZhIiwicm9sZSI6InRzZGJfcmVhZGVyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJmYWN0b3J5IGFkbWluIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZmFjdG9yeV9hZG1pbiIsImdpdmVuX25hbWUiOiJmYWN0b3J5IiwiZmFtaWx5X25hbWUiOiJhZG1pbiIsImVtYWlsIjoiZmFjdG9yeV9hZG1pbkBpbmR1c3RyeS1mdXNpb24uY29tIn0.gpmhXfc_AT8xwAi9UfW0IQcEswf1JdSPahWjoccNx4858ptcXaajjd2vK4sJ4_hczo5JMxTnbP62p1r0ov8HaOby3bgKfOFUuN8vaC1Fm21C_Cbc_VvssyVJeOdtAcDX0ziB_CAUpMLjg2s7TcThNWJTjYh_NJhZHMj2yXkba-0oLjYrhwWWKRWsct_gCAKRjpOZpSl9xmD7S1HJ_5iMQL4w0vJ1eQ4nz8mTK9LVT0qDwOcuNdXlk8FU1t0xFAHp-pOcbykeXOW1OMOLzA3E82wuSc_OUtqEwuVoV4AE0uzF-freUZIQa2XqF-swkOr92_zPd0h0IB-voK-uZONScw'
            return this.cronService.validateScript(token);
        } catch (err) {
            throw new NotFoundException("Error fetching assets " + err);
        }
    }
}