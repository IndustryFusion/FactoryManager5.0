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

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OnboardingDocument = HydratedDocument<Onboarding>;

@Schema()
export class Onboarding {
  
  @Prop({ required: true })
  ip_address: string;

  @Prop()
  main_topic: string;

  @Prop({ required: true })
  protocol: string;

  @Prop({ type: Object, required: true })
  app_config: Record<string, any>;

  @Prop({ required: true })
  pod_name: string;

  @Prop({ required: true })
  pdt_mqtt_hostname: string;

  @Prop({ required: true })
  pdt_mqtt_port: number;

  @Prop({ required: true })
  secure_config: boolean;

  @Prop({ required: true })
  device_id: string;

  @Prop({ required: true })
  gateway_id: string;

  @Prop({ required: true })
  keycloak_url: string;

  @Prop({ required: true })
  realm_password: string;

  @Prop()
  username_config: string;

  @Prop()
  password_config: string;

  @Prop({ required: true })
  dataservice_image_config: string;

  @Prop({ required: true })
  agentservice_image_config: string;
}

export const OnboardingSchema = SchemaFactory.createForClass(Onboarding);