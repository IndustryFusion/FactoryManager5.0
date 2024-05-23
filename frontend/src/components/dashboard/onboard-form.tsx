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

interface OnboardFormProps {
    showBlockerProp: boolean;
    setShowBlockerProp: Dispatch<SetStateAction<boolean>>;
    asset: any;
    setBlocker: Dispatch<SetStateAction<boolean>>
    setOnboardAssetProp: Dispatch<SetStateAction<boolean>>
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
    const [onboardForm, setOnboardForm] = useState(
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
    )
    const toast = useRef<any>(null);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };

    const handleInputChange = (value: any, key: any) => {
        if (key === "pdt_mqtt_port") {
            setOnboardForm({ ...onboardForm, [key]: Number(value) })
        }
        else {
            setOnboardForm({ ...onboardForm, [key]: value })
        }
    }
    const handleInputTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>, key: any) => {
        setOnboardForm({ ...onboardForm, [key]: e.target.value })
    }
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const modifiedOnboardForm = {
            ...onboardForm,
            app_config: "|" + onboardForm.app_config
        };

        const payload = JSON.stringify(modifiedOnboardForm);

        console.log("on submit payload", payload);
        

        try {
            const response = await axios.post(API_URL + "/onboarding-asset", payload, {
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

        } catch (error: any) {
            console.log("onboardform error", error);
            if (error.response.status === 404) {
                showToast('error', "Error", "Error saving onboard form")
            }
            else if (error.response.status === 500) {
                showToast('error', "Error", "Internal Server Error")
            }
        }

    }

    const headerElement = (
        <div>
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
                style={{ width: '50rem' }} onHide={() => {
                    setShowBlockerProp(false)
                    setOnboardAssetProp(false)
                }
                }
                draggable={false} resizable={false}
            >
                <div className="card ">
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
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="realm_password">Realm Password</label>
                                <Password
                                    value={onboardForm.realm_password}
                                    toggleMask
                                    autoComplete=""
                                    onChange={(e) => handleInputChange(e.target.value, "realm_password")}
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
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="agentservice_image_config">Agentservice Image Config</label>
                                <InputText
                                    id="agentservice_image_config"
                                    value={onboardForm.agentservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                    placeholder="ex:iff-iot-agent:v0.0.2"
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