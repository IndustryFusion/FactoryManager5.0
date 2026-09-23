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

import { notifyError } from "@/utility/global-toast";
import { isMachineRunning } from "@/utility/machine-state";
import { logHandledError } from "@/utility/log";import { linkTargets } from "@/utility/ngsi-links";

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
          notifyError(t('toast:error'), error, t('toast:load_alerts_failed'));
        }
    }

    // Returns true when a real machine_state reading was found (and the clock started).
    const fetchData = async (): Promise<boolean> => {
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
    
                // Only a real reading starts the uptime clock. Without one there is
                // nothing to count from, and the timer used to tick up from 00:00:00
                // for a machine that has never reported.
                if (Array.isArray(response.data) && response.data.length > 0 && isMachineRunning(response.data[0]?.value)) {
                    const timeValueReceived = findDifference(response.data[0]?.observedAt);
                    setDifference(timeValueReceived);
                    setPrevTimer(timeValueReceived); //set intial timer value
                    return true;
                }
            } 
        }
        catch (error) {
            console.log("Error From fetchData function from @components/dashboard/dashboard-cards.tsx",error);
          notifyError(t('toast:error'), error, t('toast:load_dashboard_failed'));
        }
        return false;
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
            logHandledError("Error fetching asset data:", error);
          notifyError(t('toast:error'), error, t('toast:load_asset_data_failed'));
        }
    };

    const runningSince = async () => {
        const hasReading = await fetchData();
        if (!hasReading) {
            setDifference("00:00:00");
            return;
        }
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
            if (key.startsWith("https://industry-fusion.org/base/v0.1/has")) {
                const propertyName = key?.split('/').pop()?.substring(3); // Remove the "has" prefix
                const propertyValue = selectedAssetData[key];
                if (propertyName) {
                    propertiesArray.push({ [propertyName]: propertyValue });
                }
            }
        }
        console.log("propertiesArray ",propertiesArray)
        propertiesArray.forEach(property => {
            const key = Object.keys(property)[0];
            const value = property[key];
            const targets = linkTargets(value).length;
            if (targets > 0) {
                setChildCount((prev) => prev + targets);
                setRelationsCount((prev) => prev + targets);
            }
        })

    }

    const relationParent = async () => {
        try {
            if (Object.keys(selectedAssetData).length > 0) {
                const response = await axios.get(API_URL + "/asset/parent-ids", {
                    params: {
                        "asset-id": selectedAssetData?.id,
                        // selectedAssetData is the raw NGSI-LD entity: the category
                        // lives under the fully-qualified key, not a short one.
                        "asset-category": selectedAssetData?.["https://industry-fusion.org/base/v0.1/asset_category"]?.value
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
          notifyError(t('toast:error'), error, t('toast:load_relations_failed'));
        }
    }

    useEffect(() => {
        if (isMachineRunning(machineStateValue)) {
            runningSince();
        } else {
            setDifference("00:00:00")
        }

        const hasPropertiesArray = [];
        if (Object.keys(selectedAssetData).length > 0) {
            for (const key in selectedAssetData) {
                if (key.startsWith("https://industry-fusion.org/base/v0.1/has")) {
                    const propertyName = key?.split('/').pop()?.substring(3);  // Remove the "has" prefix
                    const propertyValue = selectedAssetData[key];
                    if (propertyName) {
                        hasPropertiesArray.push({ [propertyName]: propertyValue });
                    }
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

    // A machine counts as running only on a real reading: see isMachineRunning.
    const isRunning = isMachineRunning(machineStateValue);

    return (
        <div className="dv_status_row">
            {/* Machine state and uptime are one fact about the machine, so they
                read as one pill instead of two cards saying half of it each. */}
            <div className={`dv_state_pill ${isRunning ? "" : "is-offline"}`}>
                <span className="dv_state_dot" />
                <span className="dv_state_pill_label">{isRunning ? t("running") : t("offline")}</span>
                {isRunning && (
                    <span className="dv_state_pill_time" suppressHydrationWarning>{difference}</span>
                )}
            </div>

            <button
                type="button"
                className="dv_status_chip is-interactive"
                onClick={() => setRelations(true)}
                title={t("relations")}
            >
                <span className="dv_status_chip_icon">
                    <Image src="/dashboard-collapse/card-3.svg" width={16} height={16} alt="" />
                </span>
                <span className="dv_status_chip_value">{childCount.toString().padStart(3, '0')}</span>
                <span>{t("child")}</span>
            </button>

            <button
                type="button"
                className="dv_status_chip is-interactive"
                onClick={() => setNotification(true)}
                title={t("notifications")}
            >
                <span className="dv_status_chip_icon">
                    <Image src="/dashboard-collapse/card-4.svg" width={16} height={16} alt="" />
                </span>
                <span className="dv_status_chip_value">{notificationData?.length}</span>
                <span>{t("unread")}</span>
            </button>

            {relations &&
                <RelationDialog
                    relationsProp={relations}
                    setRelationsProp={setRelations}
                    selectedAssetData={selectedAssetData}
                />
            }
            {notification &&
                <NotificationDialog
                    notificationProp={notification}
                    setNotificationProp={setNotification}
                />
            }
        </div>
    )
}

export default DashboardCards;