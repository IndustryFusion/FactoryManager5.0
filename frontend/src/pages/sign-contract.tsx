import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import Image from 'next/image.js';
import { Toast } from 'primereact/toast';
import { getAccessGroup } from "../utility/indexed-db";
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "../styles/add-contract.css";
import { getCompanyDetailsById } from '../utility/auth';
import { getTemplateByName, getCompanyCertificate, getContractByType, getAssetByType, getAssetCertificateById, createBinding } from '@/utility/contract';
import { Dropdown } from 'primereact/dropdown';
import moment from 'moment';

interface PropertyDefinition {
    type: string;
    title: string;
    description: string;
    readOnly?: boolean;
    app?: string;
    default?: any;
    enums?: string[];
    minimum?: number;
    maximum?: number;
    segment?: string;
}

interface TemplateData {
    type: string;
    title: string;
    description: string;
    properties: {
        [key: string]: PropertyDefinition;
    };
}

const AddContractPage: React.FC = () => {
    const router = useRouter();
    const [templateData, setTemplateData] = useState<TemplateData | null>(null);
    const [formData, setFormData] = useState<{ [key: string]: any }>({
        asset_type: 'laserCutter',
        contract_title: 'Contract Title'
    });
    const [selectedAssetProperties, setSelectedAssetProperties] = useState<string[]>([]);
    const toast = useRef<Toast>(null);
    const [certificateExpiry, setCertificateExpiry] = useState<Date | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [assetOptions, setAssetOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [companyIfricId, setCompanyIfricId] = useState(null);
    const [assetVerified, setAssetVerified] = useState<boolean | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchAssetCertificate();
    }, [selectedAsset]);

    const fetchData = async () => {
        try {
            const userData = await getAccessGroup();
            if (userData && userData.jwt_token) {
                setCompanyIfricId(userData.company_ifric_id);
                // Fetch template data (from backend)
                const templateResponse = await getTemplateByName("predictiveMaintenance_laserCutter");
                const template = templateResponse?.data[0];
                console.log(template);
                setTemplateData(template);
                initializeFormData(template.properties);

                setFormData(prevState => ({
                    ...prevState,
                    data_provider_company_ifric_id: userData.company_ifric_id,
                }));

                // Fetch company certificate
                const companyCertResponse = await getCompanyCertificate(userData.company_ifric_id);
                if (companyCertResponse && companyCertResponse.data && companyCertResponse.data.length > 0) {
                    const companyCert = companyCertResponse.data[0];
                    setFormData(prevState => ({
                        ...prevState,
                        provider_company_certificate_data: companyCert.certificate_data
                    }));

                    setCertificateExpiry(new Date(companyCert.expiry_on));
                }

                // Fetch producer company details
                if (userData.company_ifric_id) {
                    const response = await fetchCompanyDetails(userData.company_ifric_id);
                    if (response?.data) {
                        setFormData(prevState => ({
                            ...prevState,
                            provider_company_name: response.data[0].company_name,
                            provider_company_address: response.data[0].address_1,
                            provider_company_city: response.data[0].city ? response.data[0].city : response.data[0].address_2,
                            provider_company_country: response.data[0].country,
                            provider_company_zip: response.data[0].zip,
                        }));
                    }
                }

                if(template) {
                    // fetch contract details
                    const contractResponse = await getContractByType(btoa(template.type));
                    if(contractResponse?.data) {
                        // Fetch producer company details
                        if (userData.company_ifric_id) {
                            const response = await fetchCompanyDetails(contractResponse.data[0].data_consumer_company_ifric_id);
                            if (response?.data) {
                                setFormData(prevState => ({
                                    ...prevState,
                                    contract_title : contractResponse.data[0].contract_name,
                                    consumer_company_name: response.data[0].company_name,
                                    consumer_company_address: response.data[0].address_1,
                                    consumer_company_city: response.data[0].city ? response.data[0].city : response.data[0].address_2,
                                    consumer_company_country: response.data[0].country,
                                    consumer_company_zip: response.data[0].zip,
                                    contract_start_date: new Date(contractResponse.data[0].created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    }),
                                    contract_end_date: new Date(contractResponse.data[0].contract_valid_till).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    }),
                                    interval: contractResponse.data[0].interval ? contractResponse.data[0].interval : "",
                                    data_consumer_company_ifric_id: contractResponse.data[0].data_consumer_company_ifric_id,
                                    contract_ifric_id: contractResponse.data[0].contract_ifric_id
                                }));
                            }
                        }
                    }
                    console.log("asset_properties ",contractResponse?.data[0])
                    // set selected asset properties
                    const selectedProperties = contractResponse?.data[0].asset_properties ? contractResponse.data[0].asset_properties.map((value: string) => value.split("/").pop()) : [];
                    console.log("selectedProperties ",selectedProperties);
                    setSelectedAssetProperties(selectedProperties);

                    // fetch assets of template type
                    const assetResponse = await getAssetByType(btoa(template.properties.asset_type.default));
                    console.log("assetResponse ",assetResponse?.data);
                    if(assetResponse?.data) {
                        const options = assetResponse.data.map((value: { id: string }) => ({
                            label: value.id,
                            value: value.id
                        }));
                        setAssetOptions(options);
                    }
                }
            } else {
                toast.current?.show({ severity: 'error', summary: 'Error', detail: 'User data or JWT not found' });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load necessary data' });
        }
    };

    const fetchAssetCertificate = async () => {
        try {
            if(selectedAsset && companyIfricId) {
                const assetCertificateResponse = await getAssetCertificateById(selectedAsset, companyIfricId);
                if(assetCertificateResponse?.data.length) {
                    const assetExpiry = moment(assetCertificateResponse.data[0].expiry_on);
                    const currentTime = moment();

                    // check whether the last certificate is expired or not.
                    if (assetExpiry.isAfter(currentTime)) {
                        setFormData(prevState => ({
                            ...prevState,
                            asset_certificate_data: assetCertificateResponse.data[0].certificate_data
                        }));
                        setAssetVerified(true);
                    } else {
                        setAssetVerified(false);
                    }

                    // check whether asset certificate expiry is before company certificate expiry
                    if(certificateExpiry) {
                        const companyExpiry = moment(certificateExpiry);
                        console.log("companyExpiry ",companyExpiry)
                        console.log("assetExpiry ",assetExpiry)
                        if(companyExpiry.isAfter(assetExpiry)) {
                            setCertificateExpiry(new Date(assetCertificateResponse.data[0].expiry_on));
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load necessary data' });
        }
    }

    const initializeFormData = (properties: { [key: string]: PropertyDefinition }) => {
        const initialData: { [key: string]: any } = {
            asset_type: 'laserCutter',
            binding_start_date: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }),
        };
        Object.entries(properties).forEach(([key, property]) => {
            if (property.app === 'creator') {
                if (property.default !== undefined) {
                    initialData[key] = property.default;
                } else if (property.type === 'array') {
                    initialData[key] = [];
                } else if (property.type === 'string') {
                    initialData[key] = '';
                } else if (property.type === 'number') {
                    initialData[key] = 0;
                } else if (property.type === 'date') {
                    initialData[key] = null;
                }
            }
        });
        setFormData(initialData);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { value: any }, field: string) => {
        const value = 'target' in e ? e.target.value : e.value;

        if (field === 'interval' && templateData && templateData.properties[field] && templateData.properties[field].minimum && templateData.properties[field].maximum) {
            if (value === '' || !isNaN(parseInt(value, 10))) {
                if (
                    value >= templateData.properties[field].minimum &&
                    value <= templateData.properties[field].maximum
                ) {
                    setFormData({ ...formData, [field]: value });
                } else {
                    toast.current?.show({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: `Value must be between ${templateData?.properties[field]?.minimum} and ${templateData?.properties[field]?.maximum}.`
                    });
                }
            }
            return;
        }

        setFormData({ ...formData, [field]: value });
    };

    const fetchCompanyDetails = async (companyId: string) => {
        try {
            return await getCompanyDetailsById(companyId);
        } catch (error) {
            console.error('Error fetching company details:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch company details' });
        }
    };

    const renderContractClauses = () => {
        const clauses = templateData?.properties.contract_clauses.enums || [];
        return (
            <Card title="Contract Clauses">
                <ul>
                    {clauses.map((clause: string, index: number) => {
                        // Split the clause based on [consumer] and [provider] placeholders
                        const parts = clause.split(/(\[consumer\]|\[provider\])/g);

                        return (
                            <li key={`clause-${index}`}>
                                {parts.map((part, partIndex) => {
                                    if (part === '[consumer]') {
                                        return (
                                            <strong key={`consumer-${index}-${partIndex}`}>
                                                {formData.consumer_company_name || 'Company Name Not Available'}
                                            </strong>
                                        );
                                    } else if (part === '[provider]') {
                                        return (
                                            <strong key={`provider-${index}-${partIndex}`}>
                                                {formData.provider_company_name || 'Provider Name Not Available'}
                                            </strong>
                                        );
                                    }
                                    return <span key={`part-${index}-${partIndex}`}>{part}</span>;
                                })}
                            </li>
                        );
                    })}
                </ul>
            </Card>
        );
    };

    const renderSelectedAssetProperties = () => (
        <Card title="Selected Asset Properties">
            <ul>
                {selectedAssetProperties.map((property, index) => (
                    <li key={`property-${index}`}>{property}</li>
                ))}
            </ul>
        </Card>
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {

            if(!selectedAsset) {
                toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Please select an asset' });
            }

            if(!formData.binding_end_date) {
                toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Please choose binding end date' });
            }

            if(assetVerified === null) {
                toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Please create certificate for selected asset' });
            }

            if(assetVerified === false) {
                toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'asset certificate is expired so please create new one' });
            }

            if(!formData.provider_company_certificate_data) {
                toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Please create company certificate' });
            }

            const result = {
                asset_ifric_id: selectedAsset,
                provider_company_name: formData.provider_company_name,
                data_consumer_company_ifric_id: formData.data_consumer_company_ifric_id,
                data_provider_company_ifric_id: formData.data_provider_company_ifric_id,
                contract_binding_valid_till: new Date(formData.binding_end_date),
                asset_certificate_data: formData.asset_certificate_data,
                provider_company_certificate_data: formData.provider_company_certificate_data,
                contract_ifric_id: formData.contract_ifric_id,
                binding_datetime_string: new Date()
            }
            console.log("result ",result);
            const response = await createBinding(result);
            console.log("response ",response?.data);
            if(response?.data.status === 201) {
                toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Contract added successfully' });
            } else {
                toast.current?.show({ severity: 'error', summary: 'Error', detail: response?.data.message });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to add contract' });
        }
    };

    const renderAssetTypeList = () => {
        const assetTypes = ['Laser Cutter'];
        return (
            <div className="asset-type-list">
                <h2>Asset Types</h2>
                <ul>
                    {assetTypes.map((assetType, index) => (
                        <li key={`assetType-${index}`}>
                            <Button
                                label={assetType}
                                onClick={() => handleAssetTypeClick(assetType)}
                                className={formData.asset_type === assetType ? 'p-button-primary' : 'p-button-outlined'}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const handleAssetTypeClick = (assetType: string) => {
        setFormData((prevState) => ({
            ...prevState,
            asset_type: assetType,
        }));
    };

    if (!templateData) return <div>Loading...</div>;

    return (
        <div className="flex">
            <div className="main_content_wrapper">
                <div className="create-contract-form-container">
                    <Toast ref={toast} />
                    <div className="create-contract-form-grid">
                        <div className="create-contract-form-wrapper">
                            <h1 className="template-form-heading">{templateData?.title}</h1>
                            <form onSubmit={handleSubmit}>
                                    <div className="form-grid">
                                        <div className="contract_title_group">
                                            <label htmlFor="contract_title" className="contract_form_field field_title">{formData.contract_title ?? ''}</label>
                                        </div>
                                        <div className="contract_form_field_column">
                                        <div className="field">
                                            <label htmlFor="contract_type">Contract Type</label>
                                            <label htmlFor="contract_type" className='pt-2'>{formData.contract_type ?? ''}</label>
                                        </div>
                                        <div className="field half-width-field">
                                            <label htmlFor="asset_type">Asset Type</label>
                                            <label htmlFor="asset_type" className='pt-2'>{formData.asset_type ?? ''}</label>
                                        </div>
                                        </div>
                                        <div className='contract_form_subheader'>Contract Time</div>
                                        <div className="contract_form_field_column">
                                            <div className="field">
                                                <label htmlFor="contract_start_date">Contract Start Date</label>
                                                <label htmlFor="contract_start_date" className='pt-2'>{formData.contract_start_date}</label>
                                            </div>
                                            <div className="field">
                                                <label htmlFor="contract_end_date">Contract End Date</label>
                                                <label htmlFor="contract_start_date" className='pt-2'>{formData.contract_end_date}</label>
                                            </div>
                                        </div>
                                        <div className='contract_form_subheader'>Binding Time</div>
                                        <div className="contract_form_field_column">
                                            <div className="field">
                                                <label htmlFor="contract_start_date">Binding Start Date</label>
                                                <label htmlFor="contract_start_date" className='pt-2'>{formData.binding_start_date}</label>
                                            </div>
                                            <div className="field">
                                                <label htmlFor="binding_end_date" className="required-field">Binding End Date</label>
                                                <Calendar
                                                    id="binding_end_date"
                                                    value={formData.binding_end_date ?? null}
                                                    onChange={(e) => handleInputChange(e, 'binding_end_date')}
                                                    showIcon
                                                    required
                                                    maxDate={certificateExpiry ? new Date(certificateExpiry.getTime()) : undefined} className='contract_form_field'
                                                />
                                                {certificateExpiry && (
                                                    <small className="p-error">
                                                        Contract end date must be before {new Date(certificateExpiry.getTime()).toLocaleDateString()}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                        <div className='contract_form_subheader'>Parties</div>
                                            <div className="contract_form_field_column">
                                            <div className="field">
                                                <label htmlFor="consumer_company_name">Data Consumer</label>
                                                <label htmlFor="consumer_company_name" className='pt-2'>{formData.consumer_company_name ?? ''}</label>
                                                <label htmlFor="consumer_company_address" className='pt-2'>{formData.consumer_company_address ?? ''}</label>
                                                <label htmlFor="consumer_company_city" className='pt-2'>{formData.consumer_company_city ?? ''}</label>
                                                <label htmlFor="consumer_company_country" className='pt-2'>{formData.consumer_company_country ?? ''}</label>
                                                <label htmlFor="consumer_company_zip" className='pt-2'>{formData.consumer_company_zip ?? ''}</label>
                                            </div>
                                            <div className="field">
                                                <label htmlFor="provider_company_name">Data Provider</label>
                                                <label htmlFor="provider_company_name" className='pt-2'>{formData.provider_company_name ?? ''}</label>
                                                <label htmlFor="provider_company_address" className='pt-2'>{formData.provider_company_address ?? ''}</label>
                                                <label htmlFor="provider_company_city" className='pt-2'>{formData.provider_company_city ?? ''}</label>
                                                <label htmlFor="provider_company_country" className='pt-2'>{formData.provider_company_country ?? ''}</label>
                                                <label htmlFor="provider_company_zip" className='pt-2'>{formData.provider_company_zip ?? ''}</label>
                                            </div>
                                        </div>
                                        <div className='contract_form_subheader'>Asset Data</div>
                                        <div className="contract_form_field_column">
                                            <div className="field">
                                                <label htmlFor="contract_start_date">Assets</label>
                                                <Dropdown 
                                                    id="assets"
                                                    value={selectedAsset}
                                                    options={assetOptions}
                                                    onChange={(e) => setSelectedAsset(e.value)}
                                                    optionLabel="label"
                                                    
                                                    placeholder="Select a asset"
                                                    required className='contract_form_field'
                                                />
                                            </div>
                                            {
                                                assetVerified == true &&
                                                <div className='asset_verified_group'>
                                                    <Image src="/verified_icon.svg" alt='company verified' width={16} height={16}></Image>
                                                    <div>IFRIC Verified</div>
                                                </div> 
                                            }
                                            {
                                                assetVerified == false &&
                                                <div className='asset_verified_group'>
                                                    <Image src="/warning.svg" alt='company verified' width={16} height={16}></Image>
                                                    <div>Not IFRIC Verified</div>
                                                </div>
                                            }
                                            
                                        </div>
                                        <div className='contract_form_subheader'>Shared Data</div>
                                        <div className="contract_form_field_column">
                                        <div className="field half-width-field">
                                            <label htmlFor="interval" className="required-field">Interval</label>
                                            <label htmlFor="interval" className='pt-2'>{formData.interval ?? ''}</label>
                                        </div>
                                        <div className="field half-width-field">
                                            <label htmlFor="asset_properties" className="required-field">Asset Properties</label>
                                            <ul>
                                                {selectedAssetProperties.map((property, index) => (
                                                    <li key={`property-${index}`}>{property}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        </div>
                                    </div>
                                {renderContractClauses()}
                                {renderSelectedAssetProperties()}
                                <div className="form-btn-container">
                                    <Button
                                        type="button"
                                        label="Cancel"
                                        className="p-button-danger p-button-outlined custom-cancel-btn"
                                        onClick={() => router.back()}
                                        icon="pi pi-times"
                                    />
                                    <Button
                                        type="reset"
                                        label="Reset"
                                        className="p-button-secondary p-button-outlined custom-reset-btn"
                                        icon="pi pi-refresh"
                                    />
                                    <Button
                                        type="submit"
                                        label="Add Contract"
                                        className="p-button-primary custom-add-btn"
                                        icon="pi pi-check"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="asset-type-list-cover">
                            {renderAssetTypeList()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddContractPage;