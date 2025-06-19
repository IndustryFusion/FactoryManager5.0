export class CreatePersistantTaskDto {
    producerId: string;
    bindingId: string;
    assetId: string;
    contractId: string;
    interval: number; // in milliseconds or seconds — clarify in documentation
    expiry: string; // ISO date string
    dataType: Record<string, any>;
    assetProperties: Record<string, any>;
}
