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

export interface OnboardData {
    ip_address?: string;
    main_topic?: string;
    protocol?: string;
    app_config?: string;
    pod_name?: string;
    pdt_mqtt_hostname?: string;
    pdt_mqtt_port?: number;
    secure_config?: boolean;
    device_id?: string;
    gateway_id?: string;
    keycloak_url?: string;
    realm_password?: string;
    username_config?: string;
    password_config?: string;
    dataservice_image_config?: string;
    agentservice_image_config?: string;
}

type OnboardDataKey = keyof OnboardData;