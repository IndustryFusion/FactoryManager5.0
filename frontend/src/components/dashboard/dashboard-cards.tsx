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

import { useDashboard } from "@/context/dashboard-context";
import { useEffect, useState } from "react";
import NotificationDialog from "./notification-card-popup";
import RelationDialog from "./relation-card-popup";
import { findDifference, findOnlineAverage } from "@/utility/chartUtility";
import { getAlerts } from "../alert/alert-service";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useTranslation } from "next-i18next";
import { AlertsResponse } from "@/types/alert-response";
import { AssetData } from "@/types/dashboard-cards";
import { Asset } from "@/types/asset-types";
import Image from "next/image";

const DashboardCards: React.FC = () => {

    const { machineStateValue,
        selectedAssetData,
        machineStateData,
        notificationData,
        setNotificationData,
        allOnlineTime,
        relationsCount,
        setRelationsCount,
        assetCount,
        setRunningSince
    } = useDashboard();
    const entityIdValue = useSelector((state: RootState) => state.entityId.id);
    const [notification, setNotification] = useState(false);
    const [relations, setRelations] = useState(false);
    const [difference, setDifference] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const [onlineAverage, setOnlineAverage] = useState(0);
    const [hasRelations, setHasRelations] = useState<Record<string, {}>[]>([]);
    const [childCount, setChildCount] = useState(0);
    const [prevTimer, setPrevTimer] = useState('00:00:00');
    let intervalId: ReturnType<typeof setInterval>;
    const { t } = useTranslation('dashboard');
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

    const fetchAllAlerts = async () => {
        try {
            const response:AlertsResponse = await getAlerts();
            const filteredNotifications = response.alerts.filter(({ resource }) => resource === entityIdValue);
            setNotificationData(filteredNotifications)
        } catch (error) {
            console.error(error)
        }
    }

    const fetchData = async () => {
        try {
            setDifference("00:00:00");
            let attributeId: string | undefined = await fetchAssets(entityIdValue);
            if (entityIdValue && attributeId && attributeId.length > 0) {
                let response = await axios.get(API_URL + '/value-change-state', {
                    params: {
                        attributeId,
                        entityId: 'eq.' + entityIdValue,
                        order: "observedAt.desc",
                        limit: '1'
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                }) 
    
                if (Array.isArray(response.data) && response.data.length > 0) {
                    if (response.data[0]?.value === "2") {
                        const timeValueReceived = findDifference(response.data[0]?.observedAt);
                        setDifference(timeValueReceived);
                        setPrevTimer(timeValueReceived); //set intial timer value
                    }
                } 
            } 
        }
        catch (error) {
            console.log("Error From fetchData function from @components/dashboard/dashboard-cards.tsx",error);
        }
    }

    const fetchAssets = async (assetId: string) => {
        try {
            let attributeId: string = '';
            const response = await axios.get(API_URL + `/asset/get-asset-by-id/${assetId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            const assetData: Asset = response.data;

            Object.keys(assetData).map((key) => {
                if (key.includes("machine_state")) {
                    attributeId = 'eq.' + key;
                }
            });
            return attributeId;
        } catch (error) {
            console.error("Error fetching asset data:", error);
        }
    };

    const runningSince = () => {
        fetchData();
        intervalId = setInterval(() => {
            setDifference(prevTimer => {
                const [hours, minutes, seconds] = prevTimer.split(':').map(Number);
                let newSeconds = seconds + 1;
                let newMinutes = minutes;
                let newHours = hours;
                if (newSeconds >= 60) {
                    newSeconds = 0;
                    newMinutes += 1;
                }
                if (newMinutes >= 60) {
                    newMinutes = 0;
                    newHours += 1;
                }
                const timerValue = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`;
                setRunningSince(newHours > 0 ? `${newHours}h` : newMinutes > 0 ? `${newMinutes}m`: `${newSeconds}s`);
                localStorage.setItem("runningTime", timerValue);
                return timerValue;
            });
        }, 1000);
        setOnlineAverage(findOnlineAverage(allOnlineTime))
    }

    const getHasProperties = () => {
        const propertiesArray = [];
        for (const key in selectedAssetData) {
            if (key.startsWith("has")) {
                const propertyName = key.substring(3); // Remove the "has" prefix
                const propertyValue = selectedAssetData[key];
                propertiesArray.push({ [propertyName]: propertyValue });
            }
        }
        console.log("propertiesArray ",propertiesArray)
        propertiesArray.forEach(property => {
            const key = Object.keys(property)[0];
            const value = property[key];
            if (Array.isArray(value) && value.length > 0) {
                value.forEach((item:AssetData) => {
                    if (item.object !== "json-ld-1.1" && item.object !== "NULL") {
                        setChildCount((prev) => prev + 1);
                        setRelationsCount((prev) => prev + 1);
                    }
                })
            } else if (typeof value === "object" && value.object !== "json-ld-1.1" && value.object !== "NULL") {
                setRelationsCount((prev) => prev + 1);
                setChildCount((prev) => prev + 1);
            }
        })

    }

    const relationParent = async () => {
        try {
            if (Object.keys(selectedAssetData).length > 0) {
                const response = await axios.get(API_URL + "/asset/parent-ids", {
                    params: {
                        "asset-id": selectedAssetData?.id,
                        "asset-category": selectedAssetData?.asset_category
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
                response?.data.forEach((item:AssetData) => {
                    if (item.id !== "json-ld-1.1") {
                        setRelationsCount((prev) => prev + 1);
                    }
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        if (machineStateValue === "2") {
            runningSince();
        } else {
            setDifference("00:00:00")
        }

        const hasPropertiesArray = [];
        if (Object.keys(selectedAssetData).length > 0) {
            for (const key in selectedAssetData) {
                if (key.startsWith("has")) {
                    const propertyName = key.substring(3); // Remove the "has" prefix
                    const propertyValue = selectedAssetData[key];
                    hasPropertiesArray.push({ [propertyName]: propertyValue });
                }
            }
        }
        setHasRelations(hasPropertiesArray);
        return () => clearInterval(intervalId);

    }, [machineStateValue, entityIdValue, selectedAssetData, allOnlineTime])

    useEffect(() => {
        setRelationsCount(0);
        getHasProperties();
        relationParent();
        fetchAllAlerts();
    }, [entityIdValue])

    return (
        <>
            <div className="dashboard-card-container">
                <div className="dashboard-card">
                    <div className="card mb-0">
                        {/* <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3 dashboard-card-text">{t('machineState')}</span>
                                <div className="text-900 font-medium text-xl">{machineStateValue == "2" ? "Online" : "Offline"}</div>

                            </div>
                            <div className={`flex align-items-center justify-content-center border-round  ${machineStateValue === "2" ? 'active-state' : 'inactive-state'}`}
                                style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className={` ${machineStateValue === "2" ? 'pi pi-sync text-green-500 text-l' : 'pi pi-exclamation-circle text-red-500 text-xl'}`}></i>
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">{assetCount.toString().padStart(2, '0')} </span>
                        <span className="text-500">{t('registered')}</span> */}
                        <div className="dashboard_card_image_wrapper">
                        <Image src="/dashboard-collapse/card-1.svg" width={24} height={24} alt=""></Image>
                        </div>
                        <div className="flex flex-column gap-1">
                            <div className="dashboard-card-text">{t('machineState')}</div>
                            <div className="dashboard-card-value">{machineStateValue == "2" ? "Online" : "Offline"}</div>
                        </div>
                    </div>
                </div>
                <div className="dashboard-card" suppressHydrationWarning>
                    <div className="card mb-0 d">
                        {/* <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3 dashboard-card-text">{t('runningSince')}</span>                              
                                <div className="text-900 font-medium text-xl">{difference}</div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-stopwatch text-orange-500 " style={{fontSize:"23px"}}/>
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">%{onlineAverage} </span>
                        <span className="text-500">{t('sinceLastWeek')}</span> */}
                        <div className="dashboard_card_image_wrapper">
                        <Image src="/dashboard-collapse/card-2.svg" width={24} height={24} alt=""></Image>
                        </div>
                        <div className="flex flex-column gap-1">
                            <div className="dashboard-card-text">{t('runningSince')}</div>
                            <div className="dashboard-card-value">{difference}</div>
                        </div>
                    </div>
                </div>
                <div className="dashboard-card" >
                    <div className="card mb-0 " onClick={() => setRelations(true)}>
                        {/* <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3 dashboard-card-text">{t('relations')}</span>
                                <div className="flex gap-1">
                                    <div className=" m-0 text-900 font-medium text-xl">{childCount.toString().padStart(3, '0')}</div>
                                    <span className="text-900 font-medium text-xl"
                                    >Child </span>
                                </div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-inbox text-cyan-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">{relationsCount.toString().padStart(2, '0')} </span>
                        <span className="text-500">{t('machinesConnected')}</span> */}
                        <div className="dashboard_card_image_wrapper">
                        <Image src="/dashboard-collapse/card-3.svg" width={24} height={24} alt=""></Image>
                        </div>
                        <div className="flex flex-column gap-1">
                            <div className="dashboard-card-text">{t('relations')}</div>
                            <div className="dashboard-card-value">{childCount.toString().padStart(3, '0')} <span>Child</span></div>
                        </div>
                    </div>
                    {relations &&
                        <RelationDialog
                            relationsProp={relations}
                            setRelationsProp={setRelations}
                        />
                    }
                </div>
                <div className="dashboard-card">
                    <div className="card mb-0" onClick={() => setNotification(true)}>
                        {/* <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3 dashboard-card-text">{t('notifications')}</span>
                                <div className="text-900 font-medium text-xl">{notificationData?.length} Unread</div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-comment text-purple-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">00 </span>
                        <span className="text-500">{t('responded')}</span> */}
                        <div className="dashboard_card_image_wrapper">
                        <Image src="/dashboard-collapse/card-4.svg" width={24} height={24} alt=""></Image>
                        </div>
                        <div className="flex flex-column gap-1">
                            <div className="dashboard-card-text">{t('notifications')}</div>
                            <div className="dashboard-card-value">{notificationData?.length} <span>Unread</span></div>
                        </div>
                    </div>
                    {notification &&
                        <NotificationDialog
                            notificationProp={notification}
                            setNotificationProp={setNotification}
                        />
                    }
                </div>
            </div>
        </>
    )
}

export default DashboardCards;