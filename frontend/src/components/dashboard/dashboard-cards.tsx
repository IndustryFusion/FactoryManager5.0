import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface DashboardCardProps {
    machineStateProp?: string;
    setMachineStateProp?: Dispatch<SetStateAction<string>>;
}

const DashboardCards: React.FC<DashboardCardProps> = ({ machineStateProp }) => {
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (machineStateProp === "2") {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer + 1);
            }, 1000);
        } else if (machineStateProp === "0") {
            setTimer(0);
        }

        return () => {
            clearInterval(interval);
        }

    }, [machineStateProp])

    const formatTime = (timeInSeconds: any) => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = timeInSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };


    return (
        <>
            <div className="grid p-4 dashboard-card-container" style={{zoom:"80%"}}>
                <div className="col-12 lg:col-6 xl:col-3  dashboard-card">
                    <div className="card mb-0">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Machine State</span>
                                <div className="text-900 font-medium text-xl">{machineStateProp == "2" ? "Online" : "Offline"}</div>

                            </div>
                            <div className={`flex align-items-center justify-content-center border-round  ${machineStateProp === "2" ? 'active-state' : 'inactive-state'}`}
                                style={{ width: '2.5rem', height: '2.5rem' }}>
                                <i className= {` ${machineStateProp === "2" ? 'pi pi-sync text-green-500 text-l' : 'pi pi-exclamation-circle text-red-500 text-xl'}`}></i>
                            </div>

                        </div>
                        <span className="text-green-500 font-medium">24 </span>
                        <span className="text-500">machines are connected</span>
                    </div>
                </div>
                <div className="col-12 lg:col-6 xl:col-3 dashboard-card">
                    <div className="card mb-0 d">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <span className="block text-500 font-medium mb-3">Running Since</span>
                                <div className="text-900 font-medium text-xl">{formatTime(timer)}</div>

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