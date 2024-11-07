import React, { useState, useEffect, useRef, Children } from 'react';
import { useRouter } from 'next/router';
import axios, { AxiosInstance } from 'axios';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import Image from 'next/image.js';
import { Toast } from 'primereact/toast';
import { Chips } from 'primereact/chips';
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";
import { getAccessGroup } from '../utility/indexed-db';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "../styles/add-contract.css";
import { getCompanyDetailsById, verifyCompanyCertificate } from '../utility/auth';
import { getTemplateByName, getCompanyCertificate, createContract, getTemplateByType, getContractByTemplates } from '../utility/contract'
import { formatDateTime } from '../utility/certificate'
import moment from 'moment';
import { Message } from 'primereact/message';
import { useDispatch, useSelector } from 'react-redux';
import { fetchContractsRedux } from '@/redux/contract/contractSlice';
import { Tree, TreeProps, TreeNodeTemplateOptions } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';

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
    const [formData, setFormData] = useState<{ [key: string]: any }>({});
    const [consumerAddress, setConsumerAddress] = useState<{ [key: string]: any }>({});
    const [assetPropertiesOptions, setAssetPropertiesOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedAssetProperties, setSelectedAssetProperties] = useState<string[]>([]);
    const toast = useRef<Toast>(null);
    const [axiosInstance, setAxiosInstance] = useState<AxiosInstance | null>(null);
    const [certificateExpiry, setCertificateExpiry] = useState<Date | null>(null);
    const [editTitle, setEditTitle] = useState<Boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [companyUser, setCompanyUser] = useState('');
    const [companyIfricId, setCompanyIfricId] = useState('');
    const [consumerCompanyCertified, setConsumerCompanyCertified] = useState<Boolean | null>(null);
    const [inputWidth, setInputWidth] = useState(0);
    const [contractNameExists, setContractNameExists] = useState(false);
    const contractsData = useSelector((state: any) => state.contracts.contracts);
    const [allContracts, setAllContracts] = useState([]);
    const [assetTemplateTree, setAssetTemplateTree] = useState<TreeNode[]>([]);
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [selectedAssetType, setSelectedAssetType] = useState<string>('');
    const dispatch = useDispatch();
    
    useEffect(() => {
          if (inputRef.current) {
            const span = document.createElement("span");
            const computedStyle = window.getComputedStyle(inputRef.current);
            span.style.font = computedStyle.font;
            span.style.padding = computedStyle.padding;
            span.style.border = computedStyle.border;
            span.style.visibility = "hidden";
            span.style.position = "absolute";
            span.style.whiteSpace = "pre";
            span.style.fontSize = '23px'
            span.textContent = formData?.contract_name || "";
            document.body.appendChild(span);
      
            const width = span.offsetWidth;
            setInputWidth(width + 20); 
            
            document.body.removeChild(span);
          }
        }, [formData?.contract_name]);

    useEffect(() => {
        fetchData();
    },[selectedAssetType])

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (editTitle && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editTitle]);

    useEffect(() => {
        setAllContracts(contractsData);
    }, [contractsData])

   

    const fetchData = async () => {
        try {
            const userData = await getAccessGroup();
            dispatch(fetchContractsRedux(userData?.company_ifric_id));
            if (userData && userData.jwt_token) {

                // set User Data
                setCompanyUser(userData.user_name);
                setCompanyIfricId(userData.company_ifric_id);

                // Fetch template data (from backend)
                if(!assetTemplateTree.length) {
                    const assetTemplates = await getContractByTemplates();
                    if(assetTemplates?.data.length) {
                        const templateTree = await initializeTreeStructure(assetTemplates?.data);
                        if(templateTree.length) {
                            setAssetTemplateTree(templateTree);
                            const firstChild = templateTree.find(value => value.children.length > 0)?.children[0];
                            if(firstChild) {
                                await initializeTemplate(firstChild.label);
                                setSelectedKey(firstChild?.key);
                                setSelectedAssetType(firstChild?.label);
                            }
                        }
                    }
                } else {
                    // if selected asset type exist
                    await initializeTemplate(selectedAssetType);
                }
                

                // Fetch company certificate
                const companyCertResponse = await getCompanyCertificate(userData.company_ifric_id);
                if (companyCertResponse?.data && companyCertResponse?.data.length > 0) {
                    const companyCert = companyCertResponse.data[0];
                    setFormData(prevState => ({
                        ...prevState,
                        data_consumer_company_ifric_id: userData.company_ifric_id,
                        consumer_company_certificate_data: companyCert.certificate_data,
                        contract_valid_till: new Date(companyCert.expiry_on)
                    }));
                    await getCompanyVerification(userData.company_ifric_id);
                    setCertificateExpiry(new Date(companyCert.expiry_on));

                    // Fetch consumer company name
                    if (userData.company_ifric_id) {
                        await fetchConsumerCompanyName(userData.company_ifric_id);
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

    const initializeTemplate = async (templateName: string) => {
        try {
            if(templateName.length) {
                const templateResponse =  await getTemplateByName(templateName);
                const template = templateResponse?.data[0];
                setTemplateData(template);
                initializeFormData(template.properties);
                setFormData(prevState => ({
                    ...prevState,
                    contract_name: template?.title,
                    interval: template.properties.interval.default,
                    asset_type: template.properties.asset_type.default
                }));

                // Fetch asset properties (from MongoDB, sandbox backend)
                const assetTypeBase64 = btoa(template.properties.asset_type.default);
                const assetPropertiesResponse = await getTemplateByType(assetTypeBase64);
                const mongoProperties = assetPropertiesResponse?.data.properties;

                // Filter only the properties with segment "realtime"
                const realtimeProps = Object.keys(mongoProperties)
                    .filter((key) => mongoProperties[key].segment === "realtime")
                    .map((key) => ({
                        label: mongoProperties[key].title,
                        value: key
                    }));

                // Setting options from MongoDB
                setAssetPropertiesOptions(realtimeProps);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch template data' });
        }
    }

    const initializeTreeStructure = (assetTypeData : Record<string,any>[]) => {
        const result = [];
        for(let i = 0; i < assetTypeData.length; i++) {
            const key = Object.keys(assetTypeData[i])[0];
            const value = assetTypeData[i][key];
            let obj = {
                key: "",
                label: "",
                data: "",
                select: false,
                children: []
            };
            obj.key = i.toString();
            obj.label = key;
            obj.data = key;
            if(value.length > 0) {
                for(let j = 0; j < value.length; j++) {
                    let obj2 = {
                        key: "",
                        label: "",
                        data: "",
                        select: true,
                        children: []
                    };
                    obj2.key = `${i.toString()}-${j.toString()}`;
                    obj2.label = value[j];
                    obj2.data = value[j];
                    obj.children.push(obj2);
                }
            }
            result.push(obj);
        }
        return result;
    }
    
    const getCompanyVerification = async(company_ifric_id: string) => {
        try{
            const response = await verifyCompanyCertificate(company_ifric_id);
            if(response?.data.success === true && response.data.status === 201){
                setConsumerCompanyCertified(true)
            }
            else{
                setConsumerCompanyCertified(false)
            }
        }
        catch(error){
            console.error(error);
        }
    }

    const initializeFormData = (properties: { [key: string]: PropertyDefinition }) => {
        const initialData: { [key: string]: any } = {
            contract_name: templateData?.title
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

    const handleInputChange = (e: any , field: string) => {
        if (field === 'interval') {
            const value =  e.target.value;
            // Ensure value is a valid number
            if (isNaN(value)) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: 'Please enter a valid number.'
                });
                return;
            }
            
    
            const min = templateData?.properties[field]?.minimum ?? 0;
            const max = templateData?.properties[field]?.maximum ?? Infinity;
            
            setFormData({ ...formData, [field]: value });
            if (value <= min || value >= max) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `Value must be between ${min} and ${max}.`
                });
            }

            return;
        }
        if(field === 'contract_name'){
            const value = e.target.value;
            const isExist = allContracts.some(contract => contract?.contract_name.toLowerCase() === value.toLowerCase());
    
            if (isExist) {
                setContractNameExists(true); 
            } else {
                setContractNameExists(false);
            }
                     
        }
        setFormData({ ...formData, [field]: e.target.value });
    };

    const fetchConsumerCompanyName = async (companyId: string) => {
        try {
            const response = await getCompanyDetailsById(companyId);
            if (response?.data) {
                setFormData(prevState => ({
                    ...prevState,
                    consumer_company_name: response.data[0].company_name,
                }));
                setConsumerAddress({
                    consumer_company_name: response.data[0].company_name,
                    consumer_company_address: response.data[0].address_1,
                    consumer_company_city: response.data[0].city ? response.data[0].city : response.data[0].address_2,
                    consumer_company_country: response.data[0].country,
                    consumer_company_zip: response.data[0].zip,
                })
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch company details' });
        }
    };

    const renderContractClauses = () => {
        const clauses = templateData?.properties.contract_clauses.enums || [];
        return (
            <div className='contract_clauses_wrapper'>
                <div className='contract_form_subheader'>Contract Clauses</div>
                <ul>
                    {clauses.map((clause: string, index: number) => {
                        const parts = clause.split('[consumer]');
                        return (
                            <li key={`clause-${index}`}>
                                {parts.map((part, partIndex) => (
                                    <React.Fragment key={`part-${index}-${partIndex}`}>
                                        {part}
                                        {partIndex < parts.length - 1 && (
                                            <strong>{consumerAddress.consumer_company_name || 'Company Name Not Available'}</strong>
                                        )}
                                    </React.Fragment>
                                ))}
                            </li>
                        );
                    })}
                </ul>
            </div>
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
        const min = templateData?.properties.interval?.minimum ?? 0;
        const max = templateData?.properties.interval?.maximum ?? Infinity;
        if (formData.interval <= min || formData.interval >= max) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: `Value must be between ${min} and ${max}.`
            });
            return;
        }
        const clauses = templateData?.properties.contract_clauses.enums || [];
        const formattedClauses = clauses.map((clause: string) =>
        clause.replace(/\[consumer\]/g, formData.consumer_company_name || 'Company Name Not Available')
                    );
         const dataToSend = {
            "asset_type": formData.asset_type,
            "contract_name": formData.contract_name,
            "consumer_company_name": formData.consumer_company_name,
            "data_consumer_company_ifric_id": companyIfricId,
            "contract_type": formData.contract_type,
            "contract_clauses": formattedClauses,
            "data_type": formData.data_type,
            "interval": formData.interval,
            "contract_valid_till": moment(formData.contract_valid_till).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            "asset_properties": selectedAssetProperties,
            "consumer_company_certificate_data": formData.consumer_company_certificate_data,
            "meta_data": {
                "create_at": moment().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
                "created_user": companyUser,
                "last_updated_at": moment().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")
            },
            "__v": 0
         }
         console.log("dataToSend", dataToSend)
        if(formData.contract_valid_till === '' || formData.contract_valid_till === null){
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Contract end date cannot be empty' });
            return;
        }
        if (selectedAssetProperties.length <= 0) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Asset properties cannot be empty' });
            return;
        }
    
        try {
            const companyVerification = await verifyCompanyCertificate(companyIfricId);
            
            // Check if the company is verified
            if (companyVerification?.data.status === 201 && companyVerification?.data.success === true) {
                const response = await getCompanyCertificate(companyIfricId);
    
                // Check if the company has certificates
                if (response?.data && response?.data.length > 0) {
                    const response = await createContract(dataToSend);

                    if (response?.statusText === "Created" && response?.data.status === 201) {
                        toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Contract created.' });
                    }
                    else {
                        toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error submitting the form', });
                    }
                } else {
                    toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No company certificates found. Please create one before proceeding' });
                }
            } else {
                toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Company certificate has expired. Please create a new certificate' });
            }
        }  catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                toast.current?.show({ severity: 'error', summary: 'Error', detail:  error?.response?.data.message });
              } else {
                console.error("Error:", error);
                toast.current?.show({ severity: 'error', summary: 'Error', detail:  error?.response?.data.message });
              };
        }
    };

    const handleSelect: TreeProps["onSelect"] = (event:any) => {
        const node = event.node;
        if (node && node.select) {
          setSelectedAssetType(node.label);
          setSelectedKey(node.key);
        }
    };

    const renderAssetTypeList = () => {
        return (
            <div className="card">
                <h2>Contract Templates</h2>
                <Tree value={assetTemplateTree} selectionMode="single" selectionKeys={selectedKey} onSelect={handleSelect} />
            </div>
        );
    };
    
    const renderDataTypeList = ()=> {
        const dataTypes = templateData?.properties.data_type.default
        return(
            <div className='datatype_chips_wrapper'>
                {dataTypes.map((dataType:string) => (
                    <div className='datatype_chip'>{dataType}</div>
                ))}
            </div>
        )
    }

    const handleAssetTypeClick = (assetType: string) => {
        setFormData((prevState) => ({
            ...prevState,
            asset_type: assetType,
        }));
    };

    if (!templateData) return <div>Loading...</div>;

    return (
        <div className="flex">
            <Sidebar/>
            <div className="main_content_wrapper">
                <div className="navbar_wrapper">
                    <Navbar navHeader={"Add Contract"} />
                </div>
                <div className="create-contract-form-container">
                    <Toast ref={toast} />
                    <div className="create-contract-form-grid">
                        <div className="create-contract-form-wrapper">
                            <form onSubmit={handleSubmit}>
                                <div className="form-grid">
                                 <div className="contract_title_group ml-3">
                                    <div>
                                   <InputText
                                    id="contract_title"
                                    ref={inputRef}
                                    value={formData.contract_name ?? ""}
                                    onChange={(e) => handleInputChange(e, "contract_name")}
                                    required
                                    className={`contract_form_field field_title ${
                                    editTitle ? "editable" : ""
                                    }`}
                                    onBlur={() => {
                                    setTimeout(() => {
                                        setEditTitle(false);
                                    }, 200);
                                    }}
                                    disabled={!editTitle}
                                    style={{ width: inputWidth + "px" }}
                                        />
                                    </div>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setEditTitle(!editTitle);
                                            }}
                                            className="contract_field_button"
                                        >
                                            {editTitle === false ? (<Image src="/add-contract/edit_icon.svg" width={22} height={22} alt='edit icon'></Image>) : (
                                                <Image src="/add-contract/save_icon.svg" width={22} height={22} alt='save icon'></Image>
                                            )}
                                        </button>
                                    </div>
                                    { contractNameExists && (
                                   <Message
                                   severity="warn"
                                   text="Contract name already exists"
                                   className="contract-warn-msg"
                                   />
                                   )}
                                    <div className="contract_form_field_column">
                                        <div className="field">
                                            <label htmlFor="contract_type" className="required-field">Contract Type</label>
                                            {!!templateData?.properties.contract_type.readOnly ? (
                                                <div className='text_large_bold'>{formData.contract_type ? formData.contract_type.split('/').pop() : ''}</div>
                                            ) : (
                                                <InputText
                                                    id="contract_type"
                                                    value={formData.contract_type ?? ''}
                                                    onChange={(e) => handleInputChange(e, 'contract_type')}
                                                    required
                                                    className='contract_form_field'
                                                />
                                            )}
                                        </div>
                                        <div className="field half-width-field">
                                            <label htmlFor="asset_type" className="required-field">Asset Type</label>
                                            {!!templateData?.properties.asset_type.readOnly ? (
                                                <div className='text_large_bold'>{formData.asset_type ? formData.asset_type.split('/').pop() : ''}</div>
                                            ) : (
                                                <InputText
                                                    id="asset_type"
                                                    value={formData.asset_type ?? ''}
                                                    onChange={(e) => handleInputChange(e, 'asset_type')}
                                                    required className='contract_form_field'
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className='contract_form_subheader'>Contract Time</div>
                                    <div className="contract_form_field_column">
                                        <div className="field">
                                            <label htmlFor="contract_start_date" className="required-field">Contract Start Date</label>
                                            <div className='text_large_bold margin_top_medium'>
                                                {new Date().toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                        </div>
                                        <div className="field">
                                            <label htmlFor="contract_valid_till" className="required-field">Contract End Date <span style={{ color: "red" }}>*</span></label>
                                            <Calendar
                                                id="contract_valid_till"
                                                value={formData.contract_valid_till ?? null}
                                                onChange={(e) => handleInputChange(e, 'contract_valid_till')}
                                                showIcon
                                                maxDate={certificateExpiry ? new Date(certificateExpiry) : undefined} className='contract_form_field' placeholder='Choose an end date' dateFormat="MM dd, yy"
                                            />
                                            {certificateExpiry && (
                                                <small className="ml-3 mt-2">
                                                    Contract end date must be before {new Date(certificateExpiry).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                    <div className='contract_form_subheader'>Parties</div>
                                    <div className="contract_form_field_column">
                                        <div className="field">
                                            {!!templateData?.properties.consumer_company_name.readOnly ? (
                                                <div className="consumer_details_wrapper">
                                                <Image src="/add-contract/company_icon.svg" width={24} height={24} alt='company icon'></Image>
                                                    <div>
                                                        <label htmlFor="provider_company_name" className="required-field">Data Consumer</label>
                                                        <div style={{ color: "#2b2b2bd6", lineHeight: "18px" }}><div className='company_verified_group'>
                                                            <div className='text_large_bold'>{consumerAddress.consumer_company_name}</div>
                                                            {(consumerCompanyCertified !== null && consumerCompanyCertified === true) && (
                                                                <Image src="/verified_icon.svg" width={16} height={16} alt='company verified icon' />
                                                            )}
                                                            {(consumerCompanyCertified !== null && consumerCompanyCertified === false) && (
                                                                <Image src="/warning.svg" width={16} height={16} alt='company not verified icon' />
                                                            )}
                                                        </div>
                                                            <div style={{ marginTop: "4px" }}>{companyIfricId ?? ''}</div>
                                                            <div style={{ marginTop: "4px" }}>{consumerAddress.consumer_company_address ?? ''}</div>
                                                            <div style={{ marginTop: "4px" }}>{consumerAddress.consumer_company_city ?? ''}</div>
                                                            <div style={{ marginTop: "4px" }}>{consumerAddress.consumer_company_country ?? ''}</div>
                                                            <div style={{ marginTop: "4px" }}>{consumerAddress.consumer_company_zip ?? ''}</div>
                                                        </div>
                                                    </div>
                                            </div>

                                            ) : (
                                                <div>
                                                    <label htmlFor="consumer_company_name" className="required-field">Data Consumer</label>
                                                    <InputText
                                                    id="consumer_company_name"
                                                    value={consumerAddress.consumer_company_name ?? ''}
                                                    onChange={(e) => handleInputChange(e, 'consumer_company_name')}
                                                    required className='contract_form_field'
                                                />
                                                </div>
                                            )}
                                        </div>
                                        <div className="field">
                                            {/* <InputText
                                                id="provider_company_name"
                                                value={formData.provider_company_name ?? ''}
                                                onChange={(e) => handleInputChange(e, 'provider_company_name')}
                                                required className='contract_form_field'
                                            /> */}
                                            <div className="consumer_details_wrapper">
                                                <Image src="/add-contract/company_icon.svg" width={24} height={24} alt='company icon'></Image>
                                                <div>
                                                    <label htmlFor="provider_company_name" className="required-field">Data Provider</label>
                                                    <div style={{color: "#2b2b2bd6", lineHeight: "18px"}}><div className='text_large_bold'>XYZ Company Gmbh</div>
                                                    <div style={{marginTop: "8px"}}>Street name, city, country</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='contract_form_subheader'>Shared Data</div>
                                    <div className="contract_form_field_column">
                                        <div className="field half-width-field">
                                            <label htmlFor="interval" className="required-field">Interval</label>
                                            <InputText
                                                id="interval"
                                                type="number"
                                                value={formData.interval ?? ''}
                                                onChange={(e) => handleInputChange(e, 'interval')}
                                                required className='contract_form_field'
                                            />
                                            <small className="ml-3 mt-2">Realtime update interval for properties.</small>
                                            {templateData?.properties.data_type && (
                                                <div className='data_types_field_wrapper'>
                                                    <label htmlFor="" className='required-field'>Data type</label>
                                                    {renderDataTypeList()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="field half-width-field">
                                            <label htmlFor="asset_properties" className="required-field">Asset Properties <span style={{color: "red"}}>*</span></label>
                                            <MultiSelect
                                                id="asset_properties"
                                                value={selectedAssetProperties}
                                                options={assetPropertiesOptions}
                                                onChange={(e) => setSelectedAssetProperties(e.value)}
                                                optionLabel="label"
                                                filter
                                                required className='contract_form_field' placeholder='Select Asset Properties'
                                            />
                                            <Chips value={selectedAssetProperties} className='asset_chips' onChange={(e) => setSelectedAssetProperties(e.value)} />
                                        </div>
                                    </div>
                                    {/* Data Consumer Company IFRIC ID */}
                                    {/* <div className="field half-width-field">
                                            <label htmlFor="data_consumer_company_ifric_id" className="required-field">Data Consumer Company IFRIC ID</label>
                                            <InputText
                                                id="data_consumer_company_ifric_id"
                                                value={formData.data_consumer_company_ifric_id ?? ''}
                                                onChange={(e) => handleInputChange(e, 'data_consumer_company_ifric_id')}
                                                required
                                            />
                                        </div>

                                        {/* Consumer Company Certificate Data */}
                                    {/*<div className="field half-width-field">
                                            <label>Consumer Company Certificate Data</label>
                                            {formData.consumer_company_certificate_data ? (
                                                <InputText
                                                    value="************************"
                                                    readOnly
                                                    className="masked-input"
                                                />
                                            ) : (
                                                <div className="no-certificate-message">No data found</div>
                                            )}
                                        </div> */}
                                </div>

                                {renderContractClauses()}

                                {/* {renderSelectedAssetProperties()} */}

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
                                        disabled={(consumerCompanyCertified !== null && consumerCompanyCertified === false)}
                                    />
                                </div>
                            </form>
                            {(consumerCompanyCertified !== null && consumerCompanyCertified === false) && (
                                <div className='floating_error_group'>
                                    <Image src="/add-contract/warning_icon_bold.svg" width={20} height={20} alt='Warning icon'></Image>
                                    <div>You must certify the company to create a contract.</div>
                                </div>
                            )}
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