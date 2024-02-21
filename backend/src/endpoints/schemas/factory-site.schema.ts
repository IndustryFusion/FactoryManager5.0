import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FactorySiteDocument = HydratedDocument<FactorySite>;

@Schema()
export class FactorySite {
  
  @Prop()
  factoryId: string;

  @Prop({ type: Object })
  factoryData: Object;
}

export const FactorySiteSchema = SchemaFactory.createForClass(FactorySite);