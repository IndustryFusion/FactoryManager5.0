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
import "../../styles/dashboard.css"
import { useTranslation } from "next-i18next";
import { OnboardData } from "@/types/onboard-form";
import { Asset } from "@/types/asset-types";
import YAML from 'yaml';

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

const OnboardForm: React.FC<OnboardFormProps> = ({
    showBlockerProp, setShowBlockerProp,
    asset, setBlocker,
    setOnboardAssetProp
}) => {
    const { t } = useTranslation('button');
    const productName = asset?.product_name === undefined && asset?.asset_communication_protocol === undefined ? "" : `${asset?.product_name}-${asset?.asset_communication_protocol}`;
    const podName = productName.toLowerCase().replace(/ /g, '');
    const assetProtocol = asset?.asset_communication_protocol === undefined ? "" : asset?.asset_communication_protocol;
    const [onboardForm, setOnboardForm] = useState<OnboardFormData>(
        {
            ip_address: "",
            main_topic: "",
            protocol: assetProtocol,
            app_config: "",
            pod_name: podName,
            pdt_mqtt_hostname: "",
            pdt_mqtt_port: 0,
            secure_config: false,
            device_id: asset?.id,
            gateway_id: asset?.id,
            keycloak_url: "",
            realm_password: "",
            username_config: "",
            password_config: "",
            dataservice_image_config: "",
            agentservice_image_config: ""
        }
    );

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
                const newPayload = YAML.parse(payload);
                console.log("payload here", newPayload);

                try {
                    const response = await axios.post(API_URL + "/onboarding-asset", newPayload, {
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
            <h3>Onboard Form</h3>
            <p className="m-0"> Please onboard the asset gateway before moving to dashboard.  </p>
            <p className="m-0">Submit the form to start the Asset onboard</p>
        </div>


    )
    const footerContent = (
        <div>
            <div className="finish-btn">
                <Button
                    onClick={handleSubmit}
                    label={t('submit')} autoFocus />
            </div>
        </div>
    )



    return (
        <>
            <Toast ref={toast} />
            <Dialog visible={showBlockerProp} modal
                header={headerElement}
                footer={footerContent}
                style={{ width: '50rem' }}
                onHide={() => {
                    setShowBlockerProp(false)
                    setOnboardAssetProp(false)
                }
                }
                draggable={false}
                resizable={false}
            >
                <div className="card onboard-form">
                    <form >
                        <div className="p-fluid p-formgrid p-grid px-3">
                            <div className="field">
                                <label htmlFor="ip_address" >IP Address</label>
                                <InputText
                                    id="ip_address"
                                    value={onboardForm.ip_address}
                                    type="text"
                                    placeholder="ex:192.168.49.26"
                                    onChange={(e) => handleInputChange(e.target.value, "ip_address")}
                                    style={{ border: validateInput?.ip_address ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="main_topic" >Main Topic</label>
                                {onboardForm.protocol === "mqtt" ?
                                    <InputText
                                        id="main_topic"
                                        value={onboardForm.main_topic}
                                        type="text"
                                        placeholder="ex:airtracker-74145/relay1"
                                        onChange={(e) => handleInputChange(e.target.value, "main_topic")}
                                        style={{ border: validateInput?.main_topic ? "1px solid red" : "" }}
                                    />
                                    :
                                    <InputText
                                        id="main_topic"
                                        value={onboardForm.main_topic}
                                        type="text"
                                        disabled
                                    />
                                }
                            </div>
                            <div className="field">
                                <label htmlFor="protocol" >Protocol</label>
                                <InputText
                                    id="protocol"
                                    value={onboardForm.protocol}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="app_config" >App Config</label>
                                <InputTextarea
                                    id="app_config"
                                    value={onboardForm.app_config}
                                    rows={10}
                                    cols={30}
                                    onChange={(e) => handleInputTextAreaChange(e, "app_config")}
                                    style={{ border: validateInput?.app_config ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pod_name">Pod Name</label>
                                <InputText
                                    id="pod_name"
                                    value={onboardForm.pod_name}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_hostname">Pdt Mqtt Hostname</label>
                                <InputText
                                    id="pdt_mqtt_hostname"
                                    value={onboardForm.pdt_mqtt_hostname}
                                    type="text"
                                    placeholder="ex:devalerta.industry-fusion.com"
                                    onChange={(e) => handleInputChange(e.target.value, "pdt_mqtt_hostname")}
                                    style={{ border: validateInput?.pdt_mqtt_hostname ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_port">Pdt Mqtt Port</label>
                                <InputNumber
                                    id="pdt_mqtt_port"
                                    value={onboardForm.pdt_mqtt_port}
                                    placeholder="ex:8883"
                                    useGrouping={false}
                                    onChange={(e) => handleInputChange(e.value, "pdt_mqtt_port")}
                                    style={{ border: validateInput?.pdt_mqtt_port ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field my-4">
                                <div className="flex gap-2">
                                    <label htmlFor="secure_config">Secure Config</label>
                                    <Checkbox
                                        checked={onboardForm.secure_config}
                                        onChange={(e) => handleInputChange(e.target.checked, "secure_config")}
                                    />
                                    <span >{onboardForm.secure_config ? "true" : "false"}</span>
                                </div>
                            </div>
                            <div className="field">
                                <label htmlFor="device_id">Device Id</label>
                                <InputText
                                    id="device_id"
                                    value={onboardForm.device_id}
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="gateway_id">Gateway Id</label>
                                <InputText
                                    id="gateway_id"
                                    value={onboardForm.gateway_id}
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="keycloak_url">KeyCloak Url</label>
                                <InputText
                                    id="keycloak_url"
                                    autoComplete="KeyCloak Url"
                                    value={onboardForm.keycloak_url}
                                    placeholder="ex:https://development.industry-fusion.com/auth/realms"
                                    onChange={e => handleInputChange(e.target.value, "keycloak_url")}
                                    style={{ border: validateInput?.keycloak_url ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="realm_password">Realm Password</label>
                                <Password
                                    value={onboardForm.realm_password}
                                    toggleMask
                                    autoComplete=""
                                    onChange={(e) => handleInputChange(e.target.value, "realm_password")}
                                    style={{ border: validateInput?.realm_password ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="username_config">Username Config</label>
                                <InputText
                                    id="username_config"
                                    value={onboardForm.username_config}
                                    onChange={e => handleInputChange(e.target.value, "username_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="password_config">Password Config</label>
                                <InputText
                                    id="password_config"
                                    value={onboardForm.password_config}
                                    onChange={e => handleInputChange(e.target.value, "password_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="dataservice_image_config">Dataservice Image Config</label>
                                <InputText
                                    id="dataservice_image_config"
                                    value={onboardForm.dataservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "dataservice_image_config")}
                                    placeholder="ex:fusionmqttdataservice:latest"
                                    style={{ border: validateInput?.dataservice_image_config ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="agentservice_image_config">Agentservice Image Config</label>
                                <InputText
                                    id="agentservice_image_config"
                                    value={onboardForm.agentservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                    placeholder="ex:iff-iot-agent:v0.0.2"
                                    style={{ border: validateInput?.agentservice_image_config ? "1px solid red" : "" }}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </Dialog>
        </>
    )
}

export default OnboardForm;