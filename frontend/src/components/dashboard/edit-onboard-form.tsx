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
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { useTranslation } from "next-i18next";
import "../../styles/dashboard.css"

interface EditOnboardAssetProp {
    editOnboardAssetProp: {
        showEditOnboard: boolean,
        onboardAssetId: string,
        successToast:boolean
    }
    setEditOnboardAssetProp: Dispatch<SetStateAction<{
        showEditOnboard: boolean;
         onboardAssetId: string;
        successToast:boolean;
    }>>
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const EditOnboardForm: React.FC<EditOnboardAssetProp> = ({ editOnboardAssetProp, setEditOnboardAssetProp }) => {
    const [onboard, setOnboard] = useState<Record<string, any>>({});
    const toast = useRef<any>(null);
    const { t } = useTranslation('button');

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
              
                              
            const productName = response.data.product_name === undefined && response.data.asset_communication_protocol === undefined
                ? "" : `${response.data.product_name}-${response.data.asset_communication_protocol}`;
                const podName =productName.toLowerCase();
            const assetProtocol = response.data.asset_communication_protocol === undefined ? "" : response.data.asset_communication_protocol;

        
            // Update the state with the new values
            setOnboard(prevState => ({
                ...prevState,
                ...response.data,
                pod_name: podName,
                protocol: assetProtocol,
                app_config: JSON.stringify(response.data.app_config)
            }));

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                showToast('error', 'Error', 'fetching onboarded data');
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        }
    }

    useEffect(() => {
        getOnboardFormData();
    }, [])

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };
    const handleInputChange = (value: any, key: any) => {
        if (key === "pdt_mqtt_port") {
            setOnboard({ ...onboard, [key]: Number(value) })
        }
        else {
            setOnboard({ ...onboard, [key]: value })
        }
    }
    const handleInputTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>, key: any) => {
        setOnboard({ ...onboard, [key]: e.target.value })
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault();   
        const modifiedOnboard = {
            ...onboard,
            app_config: JSON.parse(onboard.app_config)
        }
        const payload = JSON.stringify(modifiedOnboard);

        try {
            const response = await axios.patch(API_URL + `/onboarding-asset/${editOnboardAssetProp.onboardAssetId}`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            console.log("onboard edit",response.data);
            
            const { success, status, message } = response.data;
            if (status === 204 && success === true) {
                setEditOnboardAssetProp(
                    {
                        ...editOnboardAssetProp,
                        showEditOnboard: false,
                        successToast:true
                    }
                )
                showToast('success', 'Success', 'onboard form updated successfully');
            }

        }catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                showToast('error', 'Error', 'Updating onboard form');
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        }
    }

    const footerContent = (
        <div>
            <div className="finish-btn">
                <Button
                    onClick={handleSubmit}
                    label={t('submit')} autoFocus />
            </div>
        </div>
    )

    const headerElement = (
        <p className="m-0 ml-5"> Update Onboard Form</p>
    )


    return (
        <>
          <Toast ref={toast} />
            <Dialog
                visible={editOnboardAssetProp.showEditOnboard} modal
                footer={footerContent}
                header={headerElement}
                style={{ width: '40rem' }} onHide={() => setEditOnboardAssetProp(
                    {
                        ...editOnboardAssetProp,
                        showEditOnboard: false
                    }
                )}
                draggable={false} resizable={false}
            >
                <div className="card onboard-form">
                    <form >
                        <div className="p-fluid p-formgrid p-grid px-3">
                            <div className="field">
                                <label htmlFor="ip_address" >IP Address</label>
                                <InputText
                                    id="ip_address"
                                    value={onboard.ip_address}
                                    type="text"
                                    placeholder="ex:192.168.49.26"
                                    onChange={(e) => handleInputChange(e.target.value, "ip_address")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="main_topic" >Main Topic</label>
                                {onboard.protocol === "mqtt" ?
                                    <InputText
                                        id="main_topic"
                                        value={onboard.main_topic}
                                        type="text"
                                        placeholder="ex:airtracker-74145/relay1"
                                        onChange={(e) => handleInputChange(e.target.value, "main_topic")}
                                    />
                                    :
                                    <InputText
                                        id="main_topic"
                                        value={onboard.main_topic}
                                        type="text"
                                        placeholder="ex:airtracker-74145/relay1"
                                        disabled
                                    />
                                }
                            </div>
                            <div className="field">
                                <label htmlFor="protocol" >Protocol</label>
                                <InputText
                                    id="protocol"
                                    value={onboard.protocol}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="app_config" >App Config</label>
                                <InputTextarea
                                    id="app_config"
                                    value={onboard.app_config}
                                    rows={10}
                                    cols={30}
                                    onChange={(e) => handleInputTextAreaChange(e, "app_config")}

                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pod_name">Pod Name</label>
                                <InputText
                                    id="pod_name"
                                    value={onboard.pod_name}
                                    type="text"
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_hostname">Pdt Mqtt Hostname</label>
                                <InputText
                                    id="pdt_mqtt_hostname"
                                    value={onboard.pdt_mqtt_hostname}
                                    type="text"
                                    placeholder="ex:devalerta.industry-fusion.com"
                                    onChange={(e) => handleInputChange(e.target.value, "pdt_mqtt_hostname")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_port">Pdt Mqtt Port</label>
                                <InputNumber
                                    id="pdt_mqtt_port"
                                    value={onboard.pdt_mqtt_port}
                                    placeholder="ex:8883"
                                    useGrouping={false}
                                    onChange={(e) => handleInputChange(e.value, "pdt_mqtt_port")}
                                />
                            </div>
                            <div className="field my-4">
                                <div className="flex gap-2">
                                    <label htmlFor="secure_config">Secure Config</label>
                                    <Checkbox
                                        checked={onboard.secure_config}
                                        onChange={(e) => handleInputChange(e.target.checked, "secure_config")}
                                    />
                                    <span >{onboard.secure_config ? "true" : "false"}</span>
                                </div>
                            </div>
                            <div className="field">
                                <label htmlFor="device_id">Device Id</label>
                                <InputText
                                    id="device_id"
                                    value={onboard.device_id}
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="gateway_id">Gateway Id</label>
                                <InputText
                                    id="gateway_id"
                                    value={onboard.gateway_id}
                                    disabled
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="keycloak_url">KeyCloak Url</label>
                                <InputText
                                    id="keycloak_url"
                                    value={onboard.keycloak_url}
                                    placeholder="ex:https://development.industry-fusion.com/auth/realms"
                                    onChange={e => handleInputChange(e.target.value, "keycloak_url")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="realm_password">Realm Password</label>
                                <Password
                                    value={onboard.realm_password}
                                    toggleMask
                                    onChange={(e) => handleInputChange(e.target.value, "realm_password")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="username_config">Username Config</label>
                                <InputText
                                    id="username_config"
                                    value={onboard.username_config}
                                    onChange={e => handleInputChange(e.target.value, "username_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="password_config">Password Config</label>
                                <InputText
                                    id="password_config"
                                    value={onboard.password_config}
                                    onChange={e => handleInputChange(e.target.value, "password_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="dataservice_image_config">Dataservice Image Config</label>
                                <InputText
                                    id="dataservice_image_config"
                                    value={onboard.dataservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "dataservice_image_config")}
                                    placeholder="ex:fusionmqttdataservice:latest"
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="agentservice_image_config">Agentservice Image Config</label>
                                <InputText
                                    id="agentservice_image_config"
                                    value={onboard.agentservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                    placeholder="ex:iff-iot-agent:v0.0.2"
                                />
                            </div>

                        </div>
                    </form>
                </div>
            </Dialog >
        </>
    )
}

export default EditOnboardForm;