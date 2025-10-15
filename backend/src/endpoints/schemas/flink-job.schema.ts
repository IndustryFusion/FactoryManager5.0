import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum JobStatus {
    QUEUED = 'QUEUED',
    RUNNING = 'RUNNING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class FlinkJob extends Document {
    @Prop({ required: true, unique: true })
    jobId: string;

    @Prop({ required: true, enum: JobStatus, default: JobStatus.QUEUED })
    status: JobStatus;

    @Prop({ required: true })
    knowledgeUrl: string;

    @Prop({ required: true })
    shaclUrl: string;

    @Prop()
    target?: string; // e.g., "deploy"

    @Prop({ type: Object })
    runnerPayload?: Record<string, any>;

    @Prop()
    runnerResponse?: string; // optional small text/JSON string

    @Prop()
    logsUrl?: string; // optional

    @Prop()
    createdAt: Date;
    @Prop()
    updatedAt: Date;
}

export const FlinkJobSchema = SchemaFactory.createForClass(FlinkJob);
