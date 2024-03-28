import { useDashboard } from "@/context/dashboard-context";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import NotificationDialog from "./notification-card-popup";
import RelationDialog from "./relation-card-popup";
import { findDifference, findOnlineAverage } from "@/utility/chartUtility";
import { getAlerts } from "../alert/alert-service";


const DashboardCards: React.FC = () => {

    // const [timer, setTimer] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const { machineStateValue,
        entityIdValue,
        setMachineStateValue,
        selectedAssetData,
        machineStateData,
        notificationData,
        setNotificationData ,
        allOnlineTime,
        relationsCount
    } = useDashboard();
    const [notification, setNotification] = useState(false);
    const [relations, setRelations] = useState(false);
    const [difference, setDifference] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const [onlineAverage, setOnlineAverage] = useState(0);
    const [hasRelations, setHasRelations] = useState<any>([]);


    // console.log(selectedAssetData, "selectedAssetData");
    // console.log("machineStateData", machineStateData);

    // console.log("allOnlineTime from machine-chart", allOnlineTime);
    

    const getNotifications =()=>{
        const fetchAllAlerts = async () => {
            try {
              const response = await getAlerts();
              // console.log(response, "akert");
              console.log(response.alerts, "alerts response");
              const filteredNotifications = response.alerts.filter(({ resource }) => resource === entityIdValue);
      
              setNotificationData(filteredNotifications)
            } catch (error) {
              console.error(error)
            }
          }
          fetchAllAlerts();
    }
    
    useEffect(() => {
        let intervalId: any;
        const runningSince = () => {
            // Reverse the keys of the object
            console.log("is coming here");
            

            for (const date in machineStateData) {
                if (machineStateData[date].length > 0) {
                    machineStateData[date].reverse();
                }
            }
            const reversedData = Object.fromEntries(Object.entries(machineStateData).reverse());
            console.log("reversedData", reversedData);

            function hasKeysWithNoValues(obj:any) {
                return Object.keys(obj).some(key => !obj[key]);
               }

            // Iterate over the reversed keys
            if (hasKeysWithNoValues(reversedData)) {
                for (const key in reversedData) {
                    const dataArray: any = reversedData[key];
                    
                    if (dataArray.length > 0) {
                        // Find the first element with prev_value === "2"
                        const allOnlineValues = [];
                        for (let i = 0; i <= dataArray.length - 1; i++) {
                            if (dataArray[i].prev_value === "2") {
                                const matchResult = dataArray[i].observedAt.match(/\d{2}:\d{2}:\d{2}/);
                                if (matchResult) {
                                    allOnlineValues.push(matchResult[0]);
                                }
                            }
                        }
                        console.log("allOnlineValues", allOnlineValues);
                        setOnlineAverage(findOnlineAverage(allOnlineValues))


                        const foundElement = dataArray.find((item: any) => item.prev_value === "2");
                        console.log("foundElement", foundElement);

                        if (foundElement) {
                            const matchResult = foundElement.observedAt.match(/\d{2}:\d{2}:\d{2}/);
                            if (matchResult) {
                                const time = matchResult[0];
                                // console.log("time", time);
                                setDifference(findDifference(time));
                                break; // Exit the loop once the condition is met
                            }
                        }
                    }
                }
            }
            else {
                console.log("no values here");
                intervalId = setInterval(() => {
                    setDifference(prevTimer => {
                        // Parse the current time
                        const [hours, minutes, seconds] = prevTimer.split(':').map(Number);
                        // Increment the time
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
                        // Format the updated time
                        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`;
                    });
                }, 1000)
                setOnlineAverage(findOnlineAverage(allOnlineTime)) 
            }

        }

        if (machineStateValue === "2") {
            runningSince();
        } else {
            setDifference("00:00:00")
        }
        const hasPropertiesArray = [];

        if (Object.keys(selectedAssetData).length > 0) {
            console.log("is come inside");

            for (const key in selectedAssetData) {
                console.log("is  coming here");

                if (key.startsWith("has")) {
                    console.log("is checking this");

                    const propertyName = key.substring(3); // Remove the "has" prefix
                    const propertyValue = selectedAssetData[key];
                    console.log("has valiess", propertyName, propertyValue);

                    hasPropertiesArray.push({ [propertyName]: propertyValue });
                }
            }
        }
        setHasRelations(hasPropertiesArray);
        getNotifications();

        return () => clearInterval(intervalId)

    }, [machineStateValue, entityIdValue, selectedAssetData, allOnlineTime])

    // console.log(" hasPropertiesArray", hasRelations, hasRelations.length);



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
                        <span className="text-green-500 font-medium">520 </span>
                        <span className="text-500">newly registered</span>
                        
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card" suppressHydrationWarning>
                    <div className="card mb-0 d">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Running Since</span>
                                {/* <div className="text-900 font-medium text-xl">{machineStateValue == "2" && runningMachineTimer()}</div> */}
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
                                    <div className=" m-0 text-900 font-medium text-xl">{hasRelations.length.toString().padStart(3, '0')}</div>
                                    <span className="relation-text font-medium">child objects</span>
                                </div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-inbox text-cyan-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">{ relationsCount} </span>
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