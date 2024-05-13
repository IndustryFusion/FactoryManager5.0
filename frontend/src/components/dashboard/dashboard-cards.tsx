import { useDashboard } from "@/context/dashboard-context";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import NotificationDialog from "./notification-card-popup";
import RelationDialog from "./relation-card-popup";
import { findDifference, findOnlineAverage } from "@/utility/chartUtility";
import { getAlerts } from "../alert/alert-service";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "@/state/store";


const DashboardCards: React.FC = () => {

    // const [timer, setTimer] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const { machineStateValue,
        selectedAssetData,
        machineStateData,
        notificationData,
        setNotificationData,
        allOnlineTime,
        relationsCount,
        setRelationsCount,
        assetCount
    } = useDashboard();
    const entityIdValue = useSelector((state: RootState) => state.entityId.id);
    const [notification, setNotification] = useState(false);
    const [relations, setRelations] = useState(false);
    const [difference, setDifference] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const [onlineAverage, setOnlineAverage] = useState(0);
    const [hasRelations, setHasRelations] = useState<any>([]);
    const [childCount, setChildCount] = useState(0);
    const [prevTimer, setPrevTimer] = useState('00:00:00');
    let intervalId: any;

    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;




    const fetchAllAlerts = async () => {
        try {
            const response = await getAlerts();
            const filteredNotifications = response.alerts.filter(({ resource }) => resource === entityIdValue);
            setNotificationData(filteredNotifications)
        } catch (error) {
            console.error(error)
        }
    }

   

    const fetchData = async () => {
        try {
            setDifference("00:00:00");
            let response = await axios.get(API_URL + '/value-change-state', {
                params: {
                    attributeId: "eq.http://www.industry-fusion.org/fields#machine-state",
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


            console.log("value change resposne", response.data);
            if (Array.isArray(response.data) && response.data.length > 0) {
                if (response.data[0]?.value === "2") {
                    const timeValueReceived = findDifference(response.data[0]?.observedAt);
                    console.log("response.data[0]?.observedAt", response.data[0]?.observedAt, entityIdValue);
                    console.log(timeValueReceived, "timeValueReceived ");
                    setDifference(timeValueReceived);
                    setPrevTimer(timeValueReceived); //set intial timer value
                }
            } 
        }
        catch (error) {
            console.log(error);
        }
    }

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
        // console.log("propertiesArray in dashboard cards", propertiesArray);
        propertiesArray.forEach(property => {
            const key = Object.keys(property)[0];
            const value = property[key];
            if (value.object !== "json-ld-1.1") {
                setRelationsCount((prev: any) => prev + 1);
                setChildCount((prev: any) => prev + 1);
            }
            if (value.length > 0) {
                value.forEach(item => {
                    if (item.object !== "json-ld-1.1") {
                        setChildCount((prev: any) => prev + 1);
                        setRelationsCount((prev: any) => prev + 1);
                    }
                })
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
                // console.log("parent relation response", response);

                response?.data.forEach(item => {
                    if (item.id !== "json-ld-1.1") {
                        setRelationsCount((prev: any) => prev + 1);
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
            <div className="grid p-4 dashboard-card-container" style={{ zoom: "80%" }}>
                <div className="col-12 lg:col-6 xl:col-3  dashboard-card">
                    <div className="card mb-0">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Machine State</span>
                                <div className="text-900 font-medium text-xl">{machineStateValue == "2" ? "Online" : "Offline"}</div>

                            </div>
                            <div className={`flex align-items-center justify-content-center border-round  ${machineStateValue === "2" ? 'active-state' : 'inactive-state'}`}
                                style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className={` ${machineStateValue === "2" ? 'pi pi-sync text-green-500 text-l' : 'pi pi-exclamation-circle text-red-500 text-xl'}`}></i>
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">{assetCount.toString().padStart(2, '0')} </span>
                        <span className="text-500"> registered</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card" suppressHydrationWarning>
                    <div className="card mb-0 d">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Running Since</span>                              
                                <div className="text-900 font-medium text-xl">{difference}</div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-map-marker text-orange-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">%{onlineAverage} </span>
                        <span className="text-500">since last week</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card" >
                    <div className="card mb-0 " onClick={() => setRelations(true)}>
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Relations</span>
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
                        <span className="text-500">machines are connected</span>
                    </div>
                    {relations &&
                        <RelationDialog
                            relationsProp={relations}
                            setRelationsProp={setRelations}
                        />
                    }
                </div>
                <div className="col-12 lg:col-6 xl:col-3 0 dashboard-card">
                    <div className="card mb-0" onClick={() => setNotification(true)}>
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Notifications</span>
                                <div className="text-900 font-medium text-xl">{notificationData?.length} Unread</div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-comment text-purple-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">00 </span>
                        <span className="text-500">responded</span>

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