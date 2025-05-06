import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsDateString,
    IsObject,
} from 'class-validator';

export class CreatePersistantTaskDto {
    @IsString()
    @IsNotEmpty()
    producerId: string;

    @IsString()
    @IsNotEmpty()
    bindingId: string;

    @IsString()
    @IsNotEmpty()
    assetId: string;

    @IsString()
    @IsNotEmpty()
    contractId: string;

    @IsNumber()
    interval: number; // in milliseconds or seconds — clarify in documentation

    @IsDateString()
    expiry: string; // ISO date string

    @IsObject()
    dataType: Record<string, any>;

    @IsObject()
    assetProperties: Record<string, any>;
}
