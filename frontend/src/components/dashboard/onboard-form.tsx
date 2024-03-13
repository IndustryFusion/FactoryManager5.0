
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { useForm } from "react-hook-form";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Password } from "primereact/password";


interface OnboardFormProps {
    showBlockerProp: boolean;
    setShowBlockerProp: Dispatch<SetStateAction<boolean>>;
    asset:any;
}
const OnboardForm: React.FC<OnboardFormProps> = ({ showBlockerProp, setShowBlockerProp, asset }) => {

    console.log(asset, "selectd asset here");
    

    const [onboardForm, setOnboardForm] = useState(
        {
            ip_address: "",
            main_topic: "",
            protocol:asset?.asset_communication_protocol,
            app_config: "",
            pod_name: `${asset?.product_name}-${asset?.asset_communication_protocol}`,
            pdt_mqtt_hostname: "",
            pdt_mqtt_port: 0,
            secure_config: true,
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

    const handleInputChange = (e: any, key: any) => {

        if (key === "pdt_mqtt_port") {
            setOnboardForm({ ...onboardForm, [key]: Number(e.target.value) })
        } else {
            setOnboardForm({ ...onboardForm, [key]: e.target.value })
        }
    }
    const handleInputTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>, key: any) => {
        setOnboardForm({ ...onboardForm, [key]: e.target.value })
    }

    console.log(onboardForm, "what are the valuese here");


    return (
        <>
            <div className="card flex justify-content-center">
                <Dialog visible={showBlockerProp} modal
                    position="top"
                    style={{ width: '40rem' }} onHide={() => setShowBlockerProp(false)}
                    draggable={false} resizable={false}
                >
                    <p className="m-0">
                        Please onboard the asset gateway before moving to dashboard. After onboarding click on 'finish' button </p>
                    <p className="m-0 mt-1 mb-3"></p>

                    <form >
                        <div className="p-fluid p-formgrid p-grid ">
                            <div className="field">
                                <label htmlFor="ip_address" >IP Address</label>
                                <InputText
                                    id="ip_address"
                                    value={onboardForm.ip_address}
                                    type="text"
                                    placeholder="192.168.49.26"
                                    onChange={(e) => handleInputChange(e, "ip_address")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="main_topic" >Main Topic</label>
                                <InputText
                                    id="main_topic"
                                    value={onboardForm.main_topic}
                                    type="text"
                                    placeholder="airtracker-74145/relay1"
                                    onChange={(e) => handleInputChange(e, "main_topic")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="protocol" >Protocol</label>
                                <InputText
                                    id="protocol"
                                    value={onboardForm.protocol}
                                    type="text"
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
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_hostname">Pdt Mqtt Hostname</label>
                                <InputText
                                    id="pdt_mqtt_hostname"
                                    value={onboardForm.pdt_mqtt_hostname}
                                    type="text"
                                    placeholder="devalerta.industry-fusion.com"
                                    onChange={(e) => handleInputChange(e, "pdt_mqtt_hostname")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="pdt_mqtt_port">Pdt Mqtt Port</label>
                                <InputNumber
                                    id="pdt_mqtt_port"
                                    value={onboardForm.pdt_mqtt_port}
                                    placeholder="8883"
                                    onChange={(e) => handleInputChange(e, "pdt_mqtt_port")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="secure_config">Secure Config</label>
                                <InputText
                                    id="secure_config"
                                    value={onboardForm.secure_config}
                                    placeholder="true"
                                    onChange={(e) => handleInputChange(e, "secure_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="device_id">Device Id</label>
                                <InputText
                                    id="device_id"
                                    value={onboardForm.device_id}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="gateway_id">Gateway Id</label>
                                <InputText
                                    id="gateway_id"
                                    value={onboardForm.gateway_id}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="keycloak_url">KeyCloak Url</label>
                                <InputText
                                    id="keycloak_url"
                                    value={onboardForm.keycloak_url}
                                    placeholder="https://development.industry-fusion.com/auth/realms"
                                    onChange={e => handleInputChange(e, "keycloak_url")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="realm_password">Realm Password</label>
                                <Password 
                                value={onboardForm.realm_password} 
                                    toggleMask
                                    onChange={(e)=>handleInputChange(e, "realm_password")}
                                    />
                            </div>
                            <div className="field">
                                <label htmlFor="username_config">Username Config</label>
                                <InputText
                                    id="username_config"
                                    value={onboardForm.username_config}
                                    onChange={e => handleInputChange(e, "username_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="password_config">Password Config</label>
                                <InputText
                                    id="password_config"
                                    value={onboardForm.password_config}
                                    onChange={e => handleInputChange(e, "password_config")}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="dataservice_image_config">Dataservice Image Config</label>
                                <InputText
                                    id="dataservice_image_config"
                                    value={onboardForm.dataservice_image_config}
                                    onChange={e => handleInputChange(e, "dataservice_image_config")}
                                    placeholder="fusionmqttdataservice:latest"
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="agentservice_image_config">Agentservice Image Config</label>
                                <InputText
                                    id="agentservice_image_config"
                                    value={onboardForm.password_config}
                                    onChange={e => handleInputChange(e, "agentservice_image_config")}
                                    placeholder="iff-iot-agent:v0.0.2"
                                />
                            </div>

                        </div>
                    </form>


                    <div>
                        <div className="finish-btn">
                            <Button
                                label="Submit" onClick={() => setShowBlockerProp(false)} autoFocus />
                        </div>
                    </div>
                </Dialog>
            </div>
        </>
    )
}

export default OnboardForm;