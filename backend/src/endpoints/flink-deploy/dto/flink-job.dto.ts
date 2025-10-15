import { IsOptional, IsString } from 'class-validator';

export class FlinkJobDto {
  @IsOptional()
  @IsString()
  target?: string; // e.g. "deploy"

  @IsOptional()
  runnerContext?: Record<string, any>; // cluster, kubeContext, etc.
}
