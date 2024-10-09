export class CreateBindingDto {
    asset_ifric_id: string;
    provider_company_name: string;
    data_consumer_company_ifric_id: string;
    data_provider_company_ifric_id: string;
    contract_binding_valid_till: Date;
    asset_certificate_data: string;
    provider_company_certificate_data: string;
    contract_ifric_id: string;
    binding_datetime_string: Date;
}
