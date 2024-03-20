
import { useDashboard } from "@/context/dashboardContext";
import { Dispatch, SetStateAction, useEffect, useState } from "react";



const DashboardCards: React.FC = () => {

    const [timer, setTimer] = useState(localStorage.getItem("runningTime") || "00:00:00");
    const [seconds, setSeconds] = useState(Number(localStorage.getItem("time difference")) || 0)
    const { machineStateValue, entityIdValue, setMachineStateValue } = useDashboard();


    useEffect(() => {
        const runningSince = () => {

            const assetOnlineTime = convertToSeconds("10:08:53 ");
            const currentTimeString = convertToSeconds(new Date().toTimeString().slice(0, 8)); // today  currenttime                      
            const difference = Math.abs(assetOnlineTime - currentTimeString);
            const differenceTimeValue = convertSecondsToTime(difference);

            setTimer(differenceTimeValue)
            // console.log("time difference",convertSecondsToTime(difference));
            localStorage.setItem("runningTime", differenceTimeValue);
            localStorage.setItem("time difference", String(difference))
            // console.log("get from localStorage",localStorage.getItem("runningTime"));

        }

        const intervalId = setInterval(() => {
            setSeconds(prevSeconds => prevSeconds + 1)
        }, 1000)

        if (machineStateValue === "2") {
            runningSince();
        } else {
            setTimer("00:00:00")
        }

        return () => clearInterval(intervalId);

    }, [machineStateValue, entityIdValue, seconds])



    const convertToSeconds = (time: string) => {
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }
    const convertSecondsToTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }


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
                        <span className="text-green-500 font-medium">24 </span>
                        <span className="text-500">machines are connected</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card" suppressHydrationWarning>
                    <div className="card mb-0 d">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Running Since</span>
                                {/* <div className="text-900 font-medium text-xl">{machineStateValue == "2" && runningMachineTimer()}</div> */}
                                <div className="text-900 font-medium text-xl">{timer}</div>

                            </div>
                            <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-map-marker text-orange-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">%52+ </span>
                        <span className="text-500">since last week</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card">
                    <div className="card mb-0 ">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Relations</span>
                                <div className="flex gap-1">
                                    <div className=" m-0 text-900 font-medium text-xl">024</div>
                                    <span className="relation-text font-medium">child objects</span>
                                </div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-inbox text-cyan-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">520 </span>
                        <span className="text-500">newly registered</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 0 dashboard-card">
                    <div className="card mb-0">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Notifications</span>
                                <div className="text-900 font-medium text-xl">152 Unread</div>
                            </div>
                            <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className="pi pi-comment text-purple-500 text-xl" />
                            </div>
                        </div>
                        <span className="text-green-500 font-medium">85 </span>
                        <span className="text-500">responded</span>

                    </div>
                </div>
            </div>
        </>
    )
}

export default DashboardCards;