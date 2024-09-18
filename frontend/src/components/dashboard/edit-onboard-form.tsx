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
    const toast = useRef<Toast>(null);
    const { t } = useTranslation('button');
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
                app_config: YAML.stringify(response.data.app_config)
            }));

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                showToast('error', 'Error', 'fetching onboarded data');
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

            if (typeof parsedConfig === "object") {
                const modifiedOnboard = {
                    ...onboard,
                    app_config: parsedConfig
                }
                const payload = YAML.stringify(modifiedOnboard);
                const newPayload = YAML.parse(payload);

                console.log("edit payload", newPayload);


                try {
                    const response = await axios.patch(API_URL + `/onboarding-asset/${editOnboardAssetProp.onboardAssetId}`, newPayload, {
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

    const footerContent = (
        <div>
            <div className="finish-btn">
                <Button
                    onClick={(e) => handleSubmit(e)}
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
                                    style={{ border: validateInput?.ip_address ? "1px solid red" : "" }}
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
                                        style={{ border: validateInput?.main_topic ? "1px solid red" : "" }}
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
                                    style={{ border: validateInput?.app_config ? "1px solid red" : "" }}
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
                                    style={{ border: validateInput?.pdt_mqtt_hostname ? "1px solid red" : "" }}
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
                                    style={{ border: validateInput?.pdt_mqtt_port ? "1px solid red" : "" }}
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
                                    style={{ border: validateInput?.keycloak_url ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="realm_password">Realm Password</label>
                                <Password
                                    value={onboard.realm_password}
                                    toggleMask
                                    onChange={(e) => handleInputChange(e.target.value, "realm_password")}
                                    style={{ border: validateInput?.realm_password ? "1px solid red" : "" }}
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
                                    style={{ border: validateInput?.dataservice_image_config ? "1px solid red" : "" }}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="agentservice_image_config">Agentservice Image Config</label>
                                <InputText
                                    id="agentservice_image_config"
                                    value={onboard.agentservice_image_config}
                                    onChange={e => handleInputChange(e.target.value, "agentservice_image_config")}
                                    placeholder="ex:iff-iot-agent:v0.0.2"
                                    style={{ border: validateInput?.agentservice_image_config ? "1px solid red" : "" }}
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