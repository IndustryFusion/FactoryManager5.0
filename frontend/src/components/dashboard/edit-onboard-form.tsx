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

import axios from "axios";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Password } from "primereact/password";
import { Toast, ToastMessage } from "primereact/toast";
import { Steps } from "primereact/steps";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { useTranslation } from "next-i18next";
import "../../styles/dashboard.css"
import { OnboardData } from "@/types/onboard-form";
import YAML from 'yaml';

type OnboardDataKey = keyof OnboardData;
interface EditOnboardAssetProp {
    editOnboardAssetProp: {
        showEditOnboard: boolean,
        onboardAssetId: string,
        successToast: boolean
    }
    setEditOnboardAssetProp: Dispatch<SetStateAction<{
        showEditOnboard: boolean;
        onboardAssetId: string;
        successToast: boolean;
    }>>
}


const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const EditOnboardForm: React.FC<EditOnboardAssetProp> = ({ editOnboardAssetProp, setEditOnboardAssetProp }) => {
    const [onboard, setOnboard] = useState<Record<string, any>>({});
    const [showSecondaryConfig, setShowSecondaryConfig] = useState(false);
    const toast = useRef<Toast>(null);
    const { t } = useTranslation(['button', 'dashboard']);
    const [validateInput, setValidateInput] = useState({
        ip_address: false,
        main_topic: false,
        app_config: false,
        pdt_mqtt_hostname: false,
        pdt_mqtt_port: false,
        keycloak_url: false,
        realm_password: false,
        dataservice_image_config: false,
        agentservice_image_config: false
    })

    const [activeStep, setActiveStep] = useState(0);

     const stepItems = [
        { label: 'Connection' },
        { label: 'Configuration' },
        { label: 'Images' },
        { label: 'Server Settings' },
        { label: 'Authentication' }
    ];

    const getOnboardFormData = async () => {
        try {
            const response = await axios.get(API_URL + `/onboarding-asset/${editOnboardAssetProp.onboardAssetId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                })
            const podName = response?.data?.pod_name.toLowerCase();
            const assetProtocol = response?.data?.protocol;
            // Update the state with the new values
            setOnboard(prevState => ({
                ...prevState,
                ...response.data,
                pod_name: podName,
                protocol: assetProtocol,
                app_config: YAML.stringify(response.data.app_config),
                secondary_app_config: response.data.secondary_app_config
                    ? YAML.stringify(response.data.secondary_app_config)
                    : ""
            }));
            if (response.data.secondary_app_config) {
                setShowSecondaryConfig(true);
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                showToast('warn', 'Warn',  error.response?.data.message + ". \n\n Please onboard the asset first!");
            }
        }
    }

    useEffect(() => {
        getOnboardFormData();
    }, [])

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };
    const handleInputChange = (value: string | number | boolean | undefined | null, key: OnboardDataKey) => {
        if (key === "pdt_mqtt_port") {
            setOnboard({ ...onboard, [key]: Number(value) });
            setValidateInput(prev => ({ ...prev, [key]: false }));
        }
        else {
            setOnboard({ ...onboard, [key]: value });
            setValidateInput(prev => ({ ...prev, [key]: false }));
        }
    }
    const handleInputTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>, key: OnboardDataKey) => {
        setOnboard({ ...onboard, [key]: e.target.value });
        setValidateInput(prev => ({ ...prev, [key]: false }));
    }

    const prettifyYAML = () => {
        try {
            const parsed = YAML.parse(onboard.app_config);
            const prettified = YAML.stringify(parsed, { indent: 2 });
            setOnboard({ ...onboard, app_config: prettified });
            showToast('success', 'Success', 'YAML formatted successfully');
        } catch (error) {
            showToast('error', 'Error', 'Invalid YAML: Unable to format');
        }
    };

    const prettifySecondaryYAML = () => {
        try {
            const parsed = YAML.parse(onboard.secondary_app_config);
            const prettified = YAML.stringify(parsed, { indent: 2 });
            setOnboard({ ...onboard, secondary_app_config: prettified });
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
                if (!onboard.ip_address) {
                    setValidateInput(prev => ({
                        ...prev,
                        ip_address: !onboard.ip_address
                    }));
                    isValid = false;
                }
                break;
            case 1: // Configuration
                if (!onboard.app_config) {
                    setValidateInput(prev => ({
                        ...prev,
                        app_config: !onboard.app_config
                    }));
                    isValid = false;
                }
                break;
            case 2: // Services
                if (!onboard.dataservice_image_config || !onboard.agentservice_image_config) {
                    setValidateInput(prev => ({
                        ...prev,
                        dataservice_image_config: !onboard.dataservice_image_config,
                        agentservice_image_config: !onboard.agentservice_image_config
                    }));
                    isValid = false;
                }
                break;
            case 3: // MQTT Settings
                if (!onboard.pdt_mqtt_hostname || !onboard.pdt_mqtt_port) {
                    setValidateInput(prev => ({
                        ...prev,
                        pdt_mqtt_hostname: !onboard.pdt_mqtt_hostname,
                        pdt_mqtt_port: !onboard.pdt_mqtt_port
                    }));
                    isValid = false;
                }
                break;
            case 4: // Authentication
                if (!onboard.keycloak_url || !onboard.realm_password) {
                    setValidateInput(prev => ({
                        ...prev,
                        keycloak_url: !onboard.keycloak_url,
                        realm_password: !onboard.realm_password
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
            main_topic,
            app_config,
            pdt_mqtt_hostname,
            pdt_mqtt_port,
            keycloak_url,
            realm_password,
            dataservice_image_config,
            agentservice_image_config
        } = onboard;

        const onboardKeys = Object.keys(validateInput);
        for (let onboardKey of onboardKeys) {
            if (onboard[onboardKey] === undefined || onboard[onboardKey] === "") {
                setValidateInput(validate => ({ ...validate, [onboardKey]: true }))
            } else if (onboard[onboardKey] === undefined || onboard[onboardKey] === 0) {
                setValidateInput(validate => ({ ...validate, [onboardKey]: true }))
            } else if (onboard?.protocol !== "mqtt" || onboard?.main_topic === "") {
                setValidateInput(validate => ({ ...validate, [onboardKey]: false }))
            }
        }

        if (ip_address === undefined || ip_address === "" ||
            app_config === undefined || app_config === "" ||
            pdt_mqtt_hostname === undefined || pdt_mqtt_hostname === "" ||
            pdt_mqtt_port === undefined || pdt_mqtt_port === 0 ||
            keycloak_url === undefined || keycloak_url === "" ||
            realm_password === undefined || realm_password === "" ||
            dataservice_image_config === undefined || dataservice_image_config === "" ||
            agentservice_image_config === undefined || agentservice_image_config === ""
        ) {
            showToast('error', "Error", "Please fill all required fields")
        } else {
            // Check if app_config is not empty and is valid JSON
            try {
                parsedConfig = YAML.parse(onboard.app_config);
            } catch (error) {
                console.error("Invalid YAML in app_config");
                showToast('error', 'Error', 'Invalid YAML in app_config');
                setValidateInput(validate => ({ ...validate, app_config: true }))
            }

            let parsedSecondaryConfig: Record<string, any> | undefined = undefined;
            if (showSecondaryConfig && onboard.secondary_app_config) {
                try {
                    parsedSecondaryConfig = YAML.parse(onboard.secondary_app_config);
                    if (typeof parsedSecondaryConfig !== "object") {
                        parsedSecondaryConfig = undefined;
                        showToast('error', 'Error', 'Invalid YAML in secondary configuration');
                    }
                } catch (error) {
                    console.error("Invalid YAML in secondary_app_config");
                    showToast('error', 'Error', 'Invalid YAML in secondary configuration');
                }
            }

            if (typeof parsedConfig === "object") {
                const modifiedOnboard: Record<string, any> = {
                    ...onboard,
                    app_config: parsedConfig
                };
                if (parsedSecondaryConfig !== undefined) {
                    modifiedOnboard.secondary_app_config = parsedSecondaryConfig;
                } else {
                    delete modifiedOnboard.secondary_app_config;
                }
                if (!showSecondaryConfig || !onboard.secondary_ip_address) {
                    delete modifiedOnboard.secondary_ip_address;
                }
                if (!showSecondaryConfig || !onboard.secondary_dataservice_image_config) {
                    delete modifiedOnboard.secondary_dataservice_image_config;
                }
                const payload = YAML.stringify(modifiedOnboard);
                const newpayload = YAML.parse(payload);
                console.log("edit payload", newpayload);
              
                try {
                    const response = await axios.patch(API_URL + `/onboarding-asset/${editOnboardAssetProp.onboardAssetId}`, newpayload, {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        withCredentials: true,
                    })

                    const { success, status, message } = response.data;
                    if (status === 204 && success === true) {
                        setEditOnboardAssetProp(
                            {
                                ...editOnboardAssetProp,
                                showEditOnboard: false,
                                successToast: true
                            }
                        )
                        showToast('success', 'Success', 'onboard form updated successfully');
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
            <h3 className="text-2xl font-semibold mb-2">{t("dashboard:update_onboard_form")}</h3>
            <p className="text-gray-600 text-sm m-0 mb-3">Update the onboarding configuration for your device</p>
            <Steps 
                model={stepItems} 
                activeIndex={activeStep} 
                onSelect={(e) => setActiveStep(e.index)}
                readOnly={false}
                className="onboard-steps mb-4"
            />
        </div>
    );

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
                        setEditOnboardAssetProp({
                            ...editOnboardAssetProp,
                            showEditOnboard: false
                        });
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
                            <p className="step-description">Network address and protocol used to connect to the machine or asset</p>
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
                                value={onboard.ip_address}
                                type="text"
                                placeholder="ex: 192.168.49.26"
                                onChange={(e) => handleInputChange(e.target.value, "ip_address")}
                                className={`w-full ${validateInput?.ip_address ? 'p-invalid' : ''}`}
                            />
                            {validateInput?.ip_address && (
                                <small className="p-error">Machine address is required</small>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="protocol" className="font-semibold">
                                {t("dashboard:protocol")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Data communication protocol the machine uses (read-only)
                            </small>
                            <InputText
                                id="protocol"
                                value={onboard.protocol}
                                type="text"
                                disabled
                                className="w-full"
                            />
                        </div>

                        {onboard.protocol === "mqtt" && (
                            <div className="field">
                                <label htmlFor="main_topic" className="font-semibold">
                                    {t("dashboard:main_topic")}
                                </label>
                                <small className="block mb-2 text-gray-600">
                                    Root MQTT topic the machine publishes data to
                                </small>
                                <InputText
                                    id="main_topic"
                                    value={onboard.main_topic}
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
                                Asset identifier used to register the machine in the system (read-only)
                            </small>
                            <InputText
                                id="device_id"
                                value={onboard.device_id}
                                disabled
                                className="w-full"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="gateway_id" className="font-semibold">
                                {t("dashboard:gateway_id")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Gateway through which the machine connects to the platform (read-only)
                            </small>
                            <InputText
                                id="gateway_id"
                                value={onboard.gateway_id}
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
                            <p className="step-description">Pod name and configuration defining how machine data (OPC-UA / MQTT) is read and mapped to the digital twin properties</p>
                        </div>

                        <div className="field">
                            <label htmlFor="pod_name" className="font-semibold">
                                {t("dashboard:pod_name")}
                            </label>
                            <small className="block mb-2 text-gray-600">
                                Kubernetes pod name for the data service that reads from the machine (read-only)
                            </small>
                            <InputText
                                id="pod_name"
                                value={onboard.pod_name}
                                type="text"
                                disabled
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
                                value={onboard.app_config}
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

                        {!showSecondaryConfig ? (
                            <div className="mt-2">
                                <Button
                                    type="button"
                                    label="Add Secondary Configuration"
                                    icon="pi pi-plus"
                                    onClick={() => setShowSecondaryConfig(true)}
                                    size="small"
                                    outlined
                                    severity="secondary"
                                />
                            </div>
                        ) : (
                            <div className="field">
                                <div className="flex align-items-center justify-content-between mb-2">
                                    <div>
                                        <label htmlFor="secondary_app_config" className="font-semibold">
                                            Secondary Configuration
                                        </label>
                                        <small className="block text-gray-600">
                                            Optional secondary YAML configuration
                                        </small>
                                    </div>
                                    <Button
                                        type="button"
                                        icon="pi pi-times"
                                        onClick={() => {
                                            setShowSecondaryConfig(false);
                                            setOnboard(prev => ({ ...prev, secondary_app_config: "", secondary_ip_address: "", secondary_dataservice_image_config: "" }));
                                        }}
                                        size="small"
                                        text
                                        severity="danger"
                                        tooltip="Remove secondary configuration"
                                    />
                                </div>
                                <div className="field mb-3">
                                    <label htmlFor="secondary_ip_address" className="font-semibold">
                                        Secondary Connection URL
                                    </label>
                                    <small className="block mb-2 text-gray-600">
                                        Connection endpoint for the secondary configuration (optional)
                                    </small>
                                    <InputText
                                        id="secondary_ip_address"
                                        value={onboard.secondary_ip_address || ""}
                                        type="text"
                                        placeholder="opc.tcp://192.168.49.xx:4840"
                                        onChange={(e) => handleInputChange(e.target.value, "secondary_ip_address")}
                                        className="w-full"
                                    />
                                </div>
                                <div className="field mb-3">
                                    <label htmlFor="secondary_dataservice_image_config" className="font-semibold">
                                        Secondary Data Service Image
                                    </label>
                                    <small className="block mb-2 text-gray-600">
                                        Docker image for the secondary data service (optional)
                                    </small>
                                    <InputText
                                        id="secondary_dataservice_image_config"
                                        value={onboard.secondary_dataservice_image_config || ""}
                                        type="text"
                                        placeholder="ex: docker.io/ibn40/fusionopcuadataservice:v0.0.1"
                                        onChange={(e) => handleInputChange(e.target.value, "secondary_dataservice_image_config")}
                                        className="w-full"
                                    />
                                </div>
                                <InputTextarea
                                    id="secondary_app_config"
                                    rows={8}
                                    cols={30}
                                    onChange={(e) => handleInputTextAreaChange(e, "secondary_app_config")}
                                    className="w-full font-mono"
                                />
                                <div className="mt-2">
                                    <Button
                                        type="button"
                                        label="Prettify YAML"
                                        icon="pi pi-sparkles"
                                        onClick={prettifySecondaryYAML}
                                        size="small"
                                        outlined
                                        className="prettify-btn"
                                    />
                                </div>
                            </div>
                        )}
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
                                value={onboard.dataservice_image_config}
                                onChange={e => handleInputChange(e.target.value, "dataservice_image_config")}
                                placeholder="ex: fusionmqttdataservice:latest"
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
                                value={onboard.agentservice_image_config}
                                onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                placeholder="ex: iff-iot-agent:v0.0.2"
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
                                PDT server hostname or IP address
                            </small>
                            <InputText
                                id="pdt_mqtt_hostname"
                                value={onboard.pdt_mqtt_hostname}
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
                                value={onboard.pdt_mqtt_port}
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
                                    checked={onboard.secure_config}
                                    onChange={(e) => handleInputChange(e.target.checked, "secure_config")}
                                />
                                <label htmlFor="secure_config" className="font-semibold mb-0 cursor-pointer">
                                    {t("dashboard:secure_config")}
                                </label>
                                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium" 
                                    style={{backgroundColor: onboard.secure_config ? '#22c55e20' : '#ef444420', 
                                            color: onboard.secure_config ? '#16a34a' : '#dc2626'}}>
                                    {onboard.secure_config ? "Enabled" : "Disabled"}
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
                                value={onboard.keycloak_url}
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
                                value={onboard.realm_password}
                                toggleMask
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
                                value={onboard.username_config}
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
                                value={onboard.password_config}
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

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                visible={editOnboardAssetProp.showEditOnboard} 
                modal
                header={headerElement}
                footer={footerContent}
                style={{ width: '60rem', maxWidth: '95vw' }} 
                onHide={() => {
                    setEditOnboardAssetProp({
                        ...editOnboardAssetProp,
                        showEditOnboard: false
                    });
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

export default EditOnboardForm;