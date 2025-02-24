export interface OnboardingDto {
  ip_address: string;
  main_topic: string;
  protocol: string;
  app_config: Record<string, any>;
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
