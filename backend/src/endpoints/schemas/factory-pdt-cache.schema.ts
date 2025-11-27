// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
// http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FactoryPdtCacheDocument = HydratedDocument<FactoryPdtCache>;

@Schema()
export class FactoryPdtCache extends Document {

    @Prop({ required: true })
    id: string;
    
    @Prop({ required: true })
    company_ifric_id: string;

    @Prop({ required: true })
    product_name: string;

    @Prop({ type: String, default: 'NULL' })
    product_image: string;

    @Prop({ required: true })
    type: string;

    @Prop({ required: true })
    asset_status: string;

    @Prop({ required: true })
    asset_category: string;

    @Prop({ type: String, default: 'NULL' })
    brand_image: string;

    @Prop({ type: String, default: 'NULL' })
    brand: string;

    @Prop({ required: true })
    creation_date: string;

    @Prop({ required: true })
    asset_cert_valid: boolean;

    @Prop({ required: true })
    asset_serial_number: string

    @Prop({ type: Boolean, default: false })
    archived: boolean;

    @Prop({ type: String, default: 'NULL' })
    production_date: string;

    @Prop({ type: Boolean, default: false })
    isPurchased: boolean;

    @Prop({ type: Boolean, default: false })
    isScorpioUpadted: boolean;

    @Prop({ type: Boolean, default: false })
    isCacheUpdated: boolean;

    @Prop({ type: String, default: ""})
    factory_site: string;

    @Prop({ type: Array, default: []})
    shop_floor: [];

    @Prop({ type: Array, default: []})
    product_line: [];
  
    @Prop({ type: Array, default: []})
    report: [];

    @Prop({ required: true, type: MongooseSchema.Types.Mixed })
    meta_data: Record<string,any>;
}

export const FactoryPdtCacheSchema = SchemaFactory.createForClass(FactoryPdtCache);