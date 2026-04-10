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

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Toast, ToastMessage } from "primereact/toast";
import { Steps } from "primereact/steps";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import "../../styles/dashboard.css"
import { useTranslation } from "next-i18next";
import { OnboardData } from "@/types/onboard-form";
import { Asset } from "@/types/asset-types";
import YAML from 'yaml';
import { getAssetById, getRawAssetById } from "@/utility/asset";

type OnboardDataKey = keyof OnboardData;

interface OnboardFormProps {
    showBlockerProp: boolean;
    setShowBlockerProp: Dispatch<SetStateAction<boolean>>;
    asset: Asset | null;
    setBlocker: Dispatch<SetStateAction<boolean>>
    setOnboardAssetProp: Dispatch<SetStateAction<boolean>>
}
interface OnboardFormData {
    ip_address: string;
    main_topic: string;
    protocol: string; // Assuming assetProtocol is a string. Adjust the type accordingly if it's different.
    app_config: string;
    pod_name: string; // Assuming podName is a string. Adjust the type accordingly if it's different.
    pdt_mqtt_hostname: string;
    pdt_mqtt_port: number;
    secure_config: boolean;
    device_id: string | undefined; // Since asset?.id could be undefined.
    gateway_id: string | undefined; // Since asset?.id could be undefined.
    keycloak_url: string;
    realm_password: string;
    username_config: string;
    password_config: string;
    dataservice_image_config: string;
    agentservice_image_config: string;
    [key: string]: string | number | boolean | null | undefined; // Adjusted index signature to exclude null
}



const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const SEGMENT_KEY = "https://industry-fusion.org/base/v0.1/segment";
const BINDING_POINT_KEY = "https://industry-fusion.org/base/v0.1/bindingPoint";

const extractString = (item: any): string => {
    if (item == null) return "";
    if (typeof item === "string") return item;
    // NGSI-LD typed value objects: { "@value": "..." } or { "value": "..." }
    if (typeof item === "object") return item["@value"] ?? item.value ?? "";
    return String(item);
};

const resolveBindingPoint = (rawValue: any): string => {
    if (Array.isArray(rawValue)) return rawValue.map(extractString).filter(Boolean).join(";");
    return rawValue != null ? String(rawValue) : "";
};

const buildOpcUaConfigTemplate = (rawAssetData: any): string => {
    const specifications: Array<{ node_id: string; identifier: string; parameter: string }> = [];

    Object.keys(rawAssetData).forEach((key) => {
        const prop = rawAssetData[key];
        if (
            prop &&
            typeof prop === "object" &&
            prop.type === "Property" &&
            prop[SEGMENT_KEY]?.value === "realtime"
        ) {
            const bindingPoint = resolveBindingPoint(prop[BINDING_POINT_KEY]?.value);
            const parts = bindingPoint ? bindingPoint.split(";") : [];
            const node_id = parts[0] || "";
            const identifier = parts.slice(1).join(";") || "";
            specifications.push({ node_id, identifier, parameter: key });
        }
    });

    if (specifications.length === 0) {
        return `fusionopcuadataservice:\n  specification:\n    - node_id: "ns=4"\n      identifier: "i=39"\n      parameter: "https://industry-fusion.org/base/v0.1/machine_state"`;
    }

    const configObj = {
        fusionopcuadataservice: {
            specification: specifications
        }
    };
    return YAML.stringify(configObj, { indent: 2 });
};

const buildMqttConfigTemplate = (rawAssetData: any): string => {
    const specifications: Array<{ topic: string; key: never[]; parameter: string[] }> = [];

    Object.keys(rawAssetData).forEach((key) => {
        const prop = rawAssetData[key];
        if (
            prop &&
            typeof prop === "object" &&
            prop.type === "Property" &&
            prop[SEGMENT_KEY]?.value === "realtime"
        ) {
            const topic = resolveBindingPoint(prop[BINDING_POINT_KEY]?.value);
            specifications.push({ topic, key: [], parameter: [key] });
        }
    });

    if (specifications.length === 0) {
        return `fusionmqttdataservice:\n  specification:\n    - topic: "airtracker-74145/relay1"\n      key: []\n      parameter:\n        - "https://industry-fusion.org/base/v0.1/machine_state"`;
    }

    const configObj = {
        fusionmqttdataservice: {
            specification: specifications
        }
    };
    return YAML.stringify(configObj, { indent: 2 });
};

const OnboardForm: React.FC<OnboardFormProps> = ({
    showBlockerProp, setShowBlockerProp,
    asset, setBlocker,
    setOnboardAssetProp
}) => {
    const [assetData, setAssetData] = useState<Asset | null>(null);




    useEffect(() => {
        const fetchAssetData = async () => {
            if (asset?.id) {
                try {
                    const assetDataFromScorio = await getAssetById(asset.id);
                    setAssetData(assetDataFromScorio);
                    const productName = assetDataFromScorio?.product_name === undefined && assetDataFromScorio?.asset_communication_protocol === undefined ? "" : `${assetDataFromScorio?.product_name}-${assetDataFromScorio?.asset_communication_protocol}`;
                    const podName = productName.toLowerCase().replace(/ /g, '');
                    let appConfig = "";
                    const protocol = assetDataFromScorio?.asset_communication_protocol;
                    if (protocol === "opc-ua" || protocol === "mqtt") {
                        const rawAssetData = await getRawAssetById(asset.id);
                        if (rawAssetData) {
                            appConfig = protocol === "opc-ua"
                                ? buildOpcUaConfigTemplate(rawAssetData)
                                : buildMqttConfigTemplate(rawAssetData);
                        }
                    }

                    setOnboardForm(prevForm => ({
                        ...prevForm,
                        dataservice_image_config: assetDataFromScorio?.asset_communication_protocol === "opc-ua" ? "docker.io/ibn40/fusionopcuadataservice:v0.0.1" : assetDataFromScorio?.asset_communication_protocol === "mqtt" ? "docker.io/ibn40/fusionmqttdataservice:v0.0.1" : "",
                        agentservice_image_config: "docker.io/ibn40/iff-iot-agent:v0.0.4",
                        protocol: assetDataFromScorio?.asset_communication_protocol || "",
                        pod_name: podName,
                        device_id: assetDataFromScorio?.id,
                        gateway_id: assetDataFromScorio?.id,
                        app_config: appConfig
                    }));
                } catch (error) {
                    console.error("Failed to fetch asset data:", error);
                }
            }
        };

        fetchAssetData();
    }, [asset?.id]);

    const { t } = useTranslation(['button', 'dashboard']);

    const [onboardForm, setOnboardForm] = useState<OnboardFormData>(
        {
            ip_address: "",
            main_topic: "",
            protocol: "",
            app_config: "",
            pod_name: "",
            pdt_mqtt_hostname: "mqtt.local",
            pdt_mqtt_port: 1883,
            secure_config: false,
            device_id: asset?.id,
            gateway_id: asset?.id,
            keycloak_url: "http://keycloak.local/auth/realms",
            realm_password: "",
            username_config: "",
            password_config: "",
            dataservice_image_config: "",
            agentservice_image_config: ""
        }
    );

    const [validateInput, setValidateInput] = useState({
        ip_address: false,
        app_config: false,
        pdt_mqtt_hostname: false,
        pdt_mqtt_port: false,
        keycloak_url: false,
        realm_password: false,
        dataservice_image_config: false,
        agentservice_image_config: false,
        protocol: false
    })

    const [activeStep, setActiveStep] = useState(0);

    const stepItems = [
        { label: 'Connection' },
        { label: 'Configuration' },
        { label: 'Images' },
        { label: 'Server Settings' },
        { label: 'Authentication' }
    ];

    const toast = useRef<Toast>(null);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };

    const handleInputChange = (value: string | number | boolean | undefined | null, key: OnboardDataKey) => {
        if (key === "pdt_mqtt_port") {
            setOnboardForm({ ...onboardForm, [key]: Number(value) });
            setValidateInput(prev => ({ ...prev, [key]: false }));
        }
        else {
            setOnboardForm({ ...onboardForm, [key]: value })
            setValidateInput(prev => ({ ...prev, [key]: false }));
        }
    }

    const handleInputTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>, key: OnboardDataKey) => {
        setOnboardForm({ ...onboardForm, [key]: e.target.value });
        setValidateInput(prev => ({ ...prev, [key]: false }));
    }

    const prettifyYAML = () => {
        try {
            const parsed = YAML.parse(onboardForm.app_config);
            const prettified = YAML.stringify(parsed, { indent: 2 });
            setOnboardForm({ ...onboardForm, app_config: prettified });
            showToast('success', 'Success', 'YAML formatted successfully');
        } catch (error) {
            showToast('error', 'Error', 'Invalid YAML: Unable to format');
        }
    };

    const goToNextStep = () => {
        if (activeStep < stepItems.length - 1) {
            setActiveStep(activeStep + 1);
        }
    };

    const goToPreviousStep = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const validateCurrentStep = () => {
        let isValid = true;
        
        switch (activeStep) {
            case 0: // Connection
                if (!onboardForm.ip_address || !onboardForm.protocol) {
                    setValidateInput(prev => ({
                        ...prev,
                        ip_address: !onboardForm.ip_address,
                        protocol: !onboardForm.protocol
                    }));
                    isValid = false;
                }
                break;
            case 1: // Configuration
                if (!onboardForm.app_config || !onboardForm.pod_name) {
                    setValidateInput(prev => ({
                        ...prev,
                        app_config: !onboardForm.app_config
                    }));
                    isValid = false;
                }
                break;
            case 2: // Services
                if (!onboardForm.dataservice_image_config || !onboardForm.agentservice_image_config) {
                    setValidateInput(prev => ({
                        ...prev,
                        dataservice_image_config: !onboardForm.dataservice_image_config,
                        agentservice_image_config: !onboardForm.agentservice_image_config
                    }));
                    isValid = false;
                }
                break;
            case 3: // MQTT Settings
                if (!onboardForm.pdt_mqtt_hostname || !onboardForm.pdt_mqtt_port) {
                    setValidateInput(prev => ({
                        ...prev,
                        pdt_mqtt_hostname: !onboardForm.pdt_mqtt_hostname,
                        pdt_mqtt_port: !onboardForm.pdt_mqtt_port
                    }));
                    isValid = false;
                }
                break;
            case 4: // Authentication
                if (!onboardForm.keycloak_url || !onboardForm.realm_password) {
                    setValidateInput(prev => ({
                        ...prev,
                        keycloak_url: !onboardForm.keycloak_url,
                        realm_password: !onboardForm.realm_password
                    }));
                    isValid = false;
                }
                break;
        }
        
        return isValid;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            goToNextStep();
        } else {
            showToast('warn', 'Validation', 'Please fill all required fields in this step');
        }
    };


    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();

        let parsedConfig;
        const {
            ip_address,
            protocol,
            app_config,
            pod_name,
            pdt_mqtt_hostname,
            pdt_mqtt_port,
            keycloak_url,
            realm_password,
            dataservice_image_config,
            agentservice_image_config
        } = onboardForm;

        const onboardKeys = Object.keys(validateInput);
        for (let onboardKey of onboardKeys) {
            if (onboardForm[onboardKey] === undefined || onboardForm[onboardKey] === "") {
                setValidateInput(validate => ({ ...validate, [onboardKey]: true }))
            } else if (onboardForm[onboardKey] === undefined || onboardForm[onboardKey] === 0) {
                setValidateInput(validate => ({ ...validate, [onboardKey]: true }))
            } else if (onboardForm?.protocol !== "mqtt" || onboardForm?.main_topic === "") {
                setValidateInput(validate => ({ ...validate, [onboardKey]: false }))
            }
        }


        if (ip_address === undefined || ip_address === "" ||
            app_config === undefined || app_config === "" ||
            protocol === undefined || protocol === "" ||
            pdt_mqtt_hostname === undefined || pdt_mqtt_hostname === "" ||
            pdt_mqtt_port === undefined || pdt_mqtt_port === 0 ||
            keycloak_url === undefined || keycloak_url === "" ||
            realm_password === undefined || realm_password === "" ||
            dataservice_image_config === undefined || dataservice_image_config === "" ||
            agentservice_image_config === undefined || agentservice_image_config === "" ||
            pod_name === undefined || pod_name === ""
        ) {

            showToast('error', "Error", "Please fill all required fields")
        } else {

            // Check if app_config is not empty and is valid YAML
            try {
                parsedConfig = YAML.parse(onboardForm.app_config);
            } catch (error) {
                console.error("Invalid YAML in app_config");
                showToast('error', 'Error', 'Invalid YAML in app_config');
                setValidateInput(validate => ({ ...validate, app_config: true }))
            }
            if (typeof parsedConfig === "object") {
                const obj = {
                    ...onboardForm,
                    app_config: parsedConfig
                }
                const payload = YAML.stringify(obj);
                const newpayload = JSON.stringify(YAML.parse(payload));

                try {
                    const response = await axios.post(API_URL + "/onboarding-asset", newpayload, {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        withCredentials: true,
                    })
                    const { success, status, message } = response.data;
                    if (status === 201 && success === true) {
                        setShowBlockerProp(false);
                        setBlocker(true);
                    } else if (success === false && status === 422) {
                        setOnboardAssetProp(true);
                        setShowBlockerProp(false);
                    }
                    else if (success === false && status === 409) {
                        console.error("Error response:", response?.data.message);
                        showToast('error', 'Error', 'Device already onboarded, please use edit form.');
                    }
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        console.error("Error response:", error.response?.data.message);
                        showToast('error', 'Error', 'Updating onboard form');
                    }
                }
            }

        }
    }

    const headerElement = (
        <div className="onboardform-header">
            <h3 className="text-2xl font-semibold mb-2">{t("dashboard:onboard_form")}</h3>
            <p className="text-gray-600 text-sm m-0">{t("dashboard:onboard_form_text_1")}</p>
            <p className="text-gray-600 text-sm m-0 mb-3">{t("dashboard:onboard_form_text_2")}</p>
            <Steps 
                model={stepItems} 
                activeIndex={activeStep} 
                onSelect={(e) => setActiveStep(e.index)}
                readOnly={false}
                className="onboard-steps mb-4"
            />
        </div>
    );

    const renderStepContent = () => {
        switch (activeStep) {
            case 0: // Connection Details
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h4 className="step-title">
                                <i className="pi pi-link"></i>
                                Machine Connection
                            </h4>
                            <p className="step-description">Enter the network address and protocol used to connect to the machine or asset</p>
                        </div>

                        <div className="field">
                            <label htmlFor="ip_address" className="font-semibold">
                                {t("dashboard:ip_address")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Machine or asset endpoint address (IP, hostname, or full connection URL)
                            </small>
                            <InputText
                                id="ip_address"
                                value={onboardForm.ip_address}
                                type="text"
                                placeholder="opc.tcp://192.168.49.xx:4840"
                                onChange={(e) => handleInputChange(e.target.value, "ip_address")}
                                className={`w-full ${validateInput?.ip_address ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.ip_address && (
                                <small className="p-error">Machine address is required</small>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="protocol" className="font-semibold">
                                {t("dashboard:protocol")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Data communication protocol the machine uses (auto-populated from asset)
                            </small>
                            <InputText
                                id="protocol"
                                value={onboardForm.protocol}
                                type="text"
                                placeholder="mqtt or opc-ua"
                                onChange={(e) => handleInputChange(e.target.value, "protocol")}
                                className={`w-full ${validateInput?.protocol ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.protocol && (
                                <small className="p-error">Protocol is required</small>
                            )}
                        </div>

                        {onboardForm.protocol === "mqtt" && (
                            <div className="field">
                                <label htmlFor="main_topic" className="font-semibold">
                                    {t("dashboard:main_topic")}
                                </label>
                                <small className="block mb-2 text-gray-600">
                                    Root MQTT topic the machine publishes data to
                                </small>
                                <InputText
                                    id="main_topic"
                                    value={onboardForm.main_topic}
                                    type="text"
                                    placeholder="ex: airtracker-74145/relay1"
                                    onChange={(e) => handleInputChange(e.target.value, "main_topic")}
                                    className="w-full"
                                />
                            </div>
                        )}

                        <div className="field">
                            <label htmlFor="device_id" className="font-semibold">
                                {t("dashboard:device_id")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Asset identifier used to register the machine in the system (auto-populated)
                            </small>
                            <InputText
                                id="device_id"
                                value={onboardForm.device_id}
                                disabled
                                className="w-full"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="gateway_id" className="font-semibold">
                                {t("dashboard:gateway_id")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Gateway through which the machine connects to the platform (auto-populated)
                            </small>
                            <InputText
                                id="gateway_id"
                                value={onboardForm.gateway_id}
                                disabled
                                className="w-full"
                            />
                        </div>
                    </div>
                );

            case 1: // Configuration
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h4 className="step-title">
                                <i className="pi pi-cog"></i>
                                Data Mapping Configuration
                            </h4>
                            <p className="step-description">Define the pod name and specify how machine data (OPC-UA / MQTT) is read and mapped to the digital twin properties</p>
                        </div>

                        <div className="field">
                            <label htmlFor="pod_name" className="font-semibold">
                                {t("dashboard:pod_name")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Kubernetes pod name for the data service that reads from the machine
                            </small>
                            <InputText
                                id="pod_name"
                                value={onboardForm.pod_name}
                                type="text"
                                onChange={(e) => handleInputChange(e.target.value, "pod_name")}
                                className="w-full"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="app_config" className="font-semibold">
                                {t("dashboard:app_config")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                YAML configuration mapping machine data points (OPC-UA nodes or MQTT topics) to digital twin properties
                            </small>
                            <InputTextarea
                                id="app_config"
                                value={onboardForm.app_config}
                                rows={12}
                                cols={30}
                                onChange={(e) => handleInputTextAreaChange(e, "app_config")}
                                className={`w-full font-mono ${validateInput?.app_config ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.app_config && (
                                <small className="p-error">Valid YAML configuration is required</small>
                            )}
                            <div className="mt-2">
                                <Button
                                    type="button"
                                    label="Prettify YAML"
                                    icon="pi pi-sparkles"
                                    onClick={prettifyYAML}
                                    size="small"
                                    outlined
                                    className="prettify-btn"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2: // Services
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h4 className="step-title">
                                <i className="pi pi-box"></i>
                                Service Images
                            </h4>
                            <p className="step-description">Specify Docker images for data and agent services</p>
                        </div>

                        <div className="field">
                            <label htmlFor="dataservice_image_config" className="font-semibold">
                                {t("dashboard:dataservice_image_config")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Docker image for the data service
                            </small>
                            <InputText
                                id="dataservice_image_config"
                                value={onboardForm.dataservice_image_config}
                                onChange={e => handleInputChange(e.target.value, "dataservice_image_config")}
                                placeholder="ex: docker.io/ibn40/fusionmqttdataservice:v0.0.1"
                                className={`w-full ${validateInput?.dataservice_image_config ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.dataservice_image_config && (
                                <small className="p-error">Data service image is required</small>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="agentservice_image_config" className="font-semibold">
                                {t("dashboard:agentservice_image_config")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Docker image for the IoT agent service
                            </small>
                            <InputText
                                id="agentservice_image_config"
                                value={onboardForm.agentservice_image_config}
                                onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                placeholder="ex: docker.io/ibn40/iff-iot-agent:v0.0.4"
                                className={`w-full ${validateInput?.agentservice_image_config ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.agentservice_image_config && (
                                <small className="p-error">Agent service image is required</small>
                            )}
                        </div>
                    </div>
                );

            case 3: // MQTT Settings
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h4 className="step-title">
                                <i className="pi pi-server"></i>
                                PDT Server Settings
                            </h4>
                            <p className="step-description">Configure PDT server connection settings</p>
                        </div>

                        <div className="field">
                            <label htmlFor="pdt_mqtt_hostname" className="font-semibold">
                                PDT {t("dashboard:hostname")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Server hostname or IP address
                            </small>
                            <InputText
                                id="pdt_mqtt_hostname"
                                value={onboardForm.pdt_mqtt_hostname}
                                type="text"
                                placeholder="ex: devalerta.industry-fusion.com"
                                onChange={(e) => handleInputChange(e.target.value, "pdt_mqtt_hostname")}
                                className={`w-full ${validateInput?.pdt_mqtt_hostname ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.pdt_mqtt_hostname && (
                                <small className="p-error">PDT hostname is required</small>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="pdt_mqtt_port" className="font-semibold">
                                PDT {t("dashboard:port")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                PDT server port number (typically 1883 or 8883 for SSL)
                            </small>
                            <InputNumber
                                id="pdt_mqtt_port"
                                value={onboardForm.pdt_mqtt_port}
                                placeholder="ex: 8883"
                                useGrouping={false}
                                onChange={(e) => handleInputChange(e.value, "pdt_mqtt_port")}
                                className={`w-full ${validateInput?.pdt_mqtt_port ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.pdt_mqtt_port && (
                                <small className="p-error">PDT port is required</small>
                            )}
                        </div>

                        <div className="field">
                            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                                <Checkbox
                                    inputId="secure_config"
                                    checked={onboardForm.secure_config}
                                    onChange={(e) => handleInputChange(e.target.checked, "secure_config")}
                                />
                                <label htmlFor="secure_config" className="font-semibold mb-0 cursor-pointer">
                                    {t("dashboard:secure_config")}
                                </label>
                                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium" 
                                    style={{backgroundColor: onboardForm.secure_config ? '#22c55e20' : '#ef444420', 
                                            color: onboardForm.secure_config ? '#16a34a' : '#dc2626'}}>
                                    {onboardForm.secure_config ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                            <small className="block mt-2 text-gray-600">
                                Enable SSL/TLS encryption for connection in case of cloud hosted PDT server
                            </small>
                        </div>
                    </div>
                );

            case 4: // Authentication
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h4 className="step-title">
                                <i className="pi pi-shield"></i>
                                Authentication
                            </h4>
                            <p className="step-description">Configure authentication and credentials</p>
                        </div>

                        <div className="field">
                            <label htmlFor="keycloak_url" className="font-semibold">
                                {t("dashboard:keycloak_url")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Keycloak authentication server URL
                            </small>
                            <InputText
                                id="keycloak_url"
                                autoComplete="KeyCloak Url"
                                value={onboardForm.keycloak_url}
                                placeholder="ex: https://development.industry-fusion.com/auth/realms"
                                onChange={e => handleInputChange(e.target.value, "keycloak_url")}
                                className={`w-full ${validateInput?.keycloak_url ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.keycloak_url && (
                                <small className="p-error">Keycloak URL is required</small>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="realm_password" className="font-semibold">
                                {t("dashboard:realm_password")} <span className="text-red-500">*</span>
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Realm password for authentication
                            </small>
                            <Password
                                inputId="realm_password"
                                value={onboardForm.realm_password}
                                toggleMask
                                autoComplete=""
                                onChange={(e) => handleInputChange(e.target.value, "realm_password")}
                                className={`w-full ${validateInput?.realm_password ? 'p-invalid' : ''}`}
                                inputClassName="w-full"
                            />
                            {validateInput?.realm_password && (
                                <small className="p-error">Realm password is required</small>
                            )}
                        </div>

                        <Divider />

                        <div className="field">
                            <label htmlFor="username_config" className="font-semibold">
                                {t("dashboard:username_config")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Optional: Additional username configuration
                            </small>
                            <InputText
                                id="username_config"
                                value={onboardForm.username_config}
                                onChange={e => handleInputChange(e.target.value, "username_config")}
                                className="w-full"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password_config" className="font-semibold">
                                {t("dashboard:password_config")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Optional: Additional password configuration
                            </small>
                            <InputText
                                id="password_config"
                                value={onboardForm.password_config}
                                onChange={e => handleInputChange(e.target.value, "password_config")}
                                className="w-full"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const footerContent = (
        <div className="onboard-footer">
            <Button
                label="Back"
                icon="pi pi-arrow-left"
                onClick={goToPreviousStep}
                disabled={activeStep === 0}
                className="back-btn"
                text
            />
            <div className="footer-actions">
                <Button
                    label="Cancel"
                    icon="pi pi-times"
                    onClick={() => {
                        setShowBlockerProp(false);
                        setOnboardAssetProp(false);
                        setActiveStep(0);
                    }}
                    className="cancel-btn"
                />
                {activeStep < stepItems.length - 1 ? (
                    <Button
                        label="Next"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        onClick={handleNext}
                        className="next-btn"
                    />
                ) : (
                    <Button
                        label={t('button:submit')}
                        icon="pi pi-check"
                        onClick={handleSubmit}
                        className="submit-btn"
                    />
                )}
            </div>
        </div>
    );



    return (
        <>
            <Toast ref={toast} />
            <Dialog 
                visible={showBlockerProp} 
                modal
                header={headerElement}
                footer={footerContent}
                style={{ width: '60rem', maxWidth: '95vw' }}
                onHide={() => {
                    setShowBlockerProp(false);
                    setOnboardAssetProp(false);
                    setActiveStep(0);
                }}
                draggable={false}
                resizable={false}
                blockScroll
            >
                <div className="onboard-form-content">
                    {renderStepContent()}
                </div>
            </Dialog>
        </>
    )
}

export default OnboardForm;