export interface OnboardingDto {
  ip_address: string;
  main_topic: string;
  protocol: string;
  app_config: Record<string, any>;
  secondary_app_config?: Record<string, any>;
  secondary_ip_address?: string;
  secondary_dataservice_image_config?: string;
  pod_name: string;
  pdt_mqtt_hostname: string;
  pdt_mqtt_port: number;
  secure_config: boolean;
  device_id: string;
  gateway_id: string;
  keycloak_url: string;
  realm_password: string;
  username_config: string;
  password_config: string;
  dataservice_image_config: string;
  agentservice_image_config: string;
}

// Value transforms, carried in app_config.fusionopcuadataservice.transforms and
// applied by the gateway's data service. See transforms.validate.ts.
export interface TransformCase {
  eq?: string;
  min?: number;
  max?: number;
  bit?: number;
  out: string;
}

export interface TransformRule {
  parameter: string;
  map?: { cases: TransformCase[]; fallback?: 'drop' | 'raw' | { value: string } };
  linear?: { factor: number; offset: number; decimals?: number; from?: string; to?: string };
  on_error?: string;
}

export interface Transforms {
  version: 1;
  rules: TransformRule[];
}
