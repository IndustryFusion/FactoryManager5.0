
import { Chart } from 'primereact/chart';
import React, { useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ChartJS from 'chart.js/auto';
import { useDashboard } from '@/context/dashboard-context';
import { Toast, ToastMessage } from 'primereact/toast';
import { ProgressSpinner } from "primereact/progressspinner";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Dropdown } from "primereact/dropdown";
import { BlockUI } from 'primereact/blockui';
import socketIOClient from "socket.io-client";
import { Asset } from "@/interfaces/asset-types";
import { types } from 'util';
import moment from 'moment';
import { Calendar } from 'primereact/calendar';
import { Button } from "primereact/button";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create } from "@/state/powerConsumption/powerConsumptionSlice";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

ChartJS.register(ChartDataLabels);
export interface Datasets {
    label: string;
    data: number[];
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    tension: number;
}
export interface pgData {
    observedAt: string;
    attributeId: string;
    value: string;
}

interface PowerConsumptionData {
    labels: string[];
    powerConsumption: number[];
    emission: number[];
}
const initialChartData = {
  labels: [],
  datasets: [
    { label: 'Power Consumption (KW)', data: [], fill: false, backgroundColor: 'rgba(75,192,192,0.4)', borderColor: 'rgba(75,192,192,1)', tension: 0.4 },
    { label: 'CO2 Emission (KG)', data: [], fill: false, backgroundColor: 'rgba(255,99,132,0.4)', borderColor: 'rgba(255,99,132,1)', tension: 0.4 },
  ],
};
const PowerCo2Chart = () => {
    const [chartData, setChartData] = useState({});
    const {autorefresh} = useDashboard();
    const entityIdValue = useSelector((state: RootState) => state.entityId.id);
    const [chartOptions, setChartOptions] = useState({});
    const [selectedInterval, setSelectedInterval] = useState<string>("days");
    const [selectedWeekSubInterval, setSelectedWeekSubInterval] = useState<string>("months");
    const [selectedMonthSubInterval, setSelectedMonthSubInterval] = useState<string>("all");
    const [noChartData, setNoChartData] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [startDate, setStartDate] = useState<Date | null>(moment().subtract(5, 'days').toDate());
    const [endDate, setEndDate] = useState<Date | null>(moment().toDate());
    const [startMonth, setStartMonth] = useState<Date | null>(moment().startOf('month').toDate());
    const [startYear, setStartYear] = useState<Date | null>(moment().startOf('year').toDate());
    const toast = useRef<any>(null);
    const dispatch = useDispatch();
    let minimumDate = useSelector((state: RootState) => state.powerConsumption.minimumDate);
    let reduxId = useSelector((state: RootState) => state.powerConsumption.id);
    console.log(`redux data ${minimumDate} id ${reduxId}`);
    useEffect(() => {
        const socket = socketIOClient(`${API_URL}/`);
        socket.on("connect", () => {
        });

        socket.on("powerConsumptionUpdate", (newData) => {
        setChartData((currentData) => {
                const updatedChartData:any = { ...currentData };
                const lastIndex = updatedChartData.chartData.labels.length - 1;
                
                // Ensure datasets array exists and has necessary structure
                if (updatedChartData.datasets && updatedChartData.datasets.length >= 2 && (updatedChartData.labels[lastIndex] == newData.labels[0])) {
                    updatedChartData.datasets[0].data[lastIndex] = newData.powerConsumption[0];
                    updatedChartData.datasets[1].data[lastIndex] = newData.emission[0];
                } else {
                    console.error("Datasets are not properly initialized");
                }
                return updatedChartData;
            });
        });

        // Disconnect socket on cleanup
        return () => {
            socket.disconnect();
            console.log('WebSocket Disconnected');
        };
    }, []);

    const intervalButtons = [
        { label: "Days", interval: "days" },
        { label: "Weeks", interval: "weeks" },
        { label: "Months", interval: "months" }
    ];
    const weekSubIntervalButtons = [
        { label: 'Months', interval: 'months' },
        { label: 'All', interval: 'all' },
        { label: 'Time', interval: 'time' }
    ];
    const monthSubIntervalButtons = [
        { label: 'All', interval: 'all' },
        { label: 'Time', interval: 'time' }
    ];

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
    };
  
    const fetchData = async (entityIdValue:any, selectedInterval:string, startTime: string, endTime: string) => {
        try {
            setIsLoading(true);
            const response = await axios.get(`${API_URL}/power-consumption/chart`, {
                params: {
                    'assetId': entityIdValue,
                    'type': selectedInterval,
                    startTime,
                    endTime
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            console.log('response ',response.data);
            if(reduxId !== entityIdValue){
                const firstValueResponse = await axios.get(`${API_URL}/power-consumption`, {
                    params: {
                        entityId: `eq.${entityIdValue}`,
                        limit: '1'
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                })
                console.log('firstValueResponse ',firstValueResponse.data);
                if(firstValueResponse.data.labels.length > 0){
                    let date = moment(firstValueResponse.data.labels[0], 'MMM Do').format('YYYY-MM-DD');
                    console.log('min date ',date);
                    dispatch(create({
                        minimumDate: date,
                        id: entityIdValue
                    }));
                }
            }
            setIsLoading(false);
            return response.data;
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                showToast('error', 'Error', `Power-co2-data ${error.response?.data.message}`);
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        }
    }
    
    const setGraphData = async (obj: PowerConsumptionData) => {
        const documentStyle = getComputedStyle(document.documentElement);
        const data = {
            labels: obj?.labels,
            datasets: [
                {
                    label: 'Power Consumption (kw/h)',
                    backgroundColor: documentStyle.getPropertyValue('--green-400'),
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    data: obj?.powerConsumption,
                },
                {
                    label: 'CO2 Emission (kg)',
                    backgroundColor: documentStyle.getPropertyValue('--blue-500'),
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    data: obj?.emission
                }
            ]
        };

        const options = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    labels: {
                        color: documentStyle.getPropertyValue('--text-color')
                    }
                },
                datalabels: {
                    color: 'black',
                    align: 'end',
                    anchor: 'center',
                    formatter: function(value: any, context: any) {
                        const datasetIndex = context.datasetIndex;
                        if (datasetIndex === 0) {
                            return `${value} kw/h`;
                        } else if (datasetIndex === 1) {
                            return `${value} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: documentStyle.getPropertyValue('--text-color-secondary')
                    },
                    grid: {
                        color: documentStyle.getPropertyValue('--surface-border')
                    }
                },
                y: {
                    display: true,
                    ticks: {
                        stepSize: 5,
                        color: documentStyle.getPropertyValue('--text-color-secondary')
                    },
                    grid: {
                        color: documentStyle.getPropertyValue('--surface-border')
                    }
                }
            }
        };

        setChartData(data);
        setChartOptions(options);
    }

    const fetchDataAndAssign = async (startTime: string, endTime: string) => {
        let attributeIds = await fetchAssets(entityIdValue);
        setNoChartData(false);
        if (entityIdValue && attributeIds && attributeIds.length > 0 && attributeIds.includes("eq.http://www.industry-fusion.org/fields#power-consumption")) {
            const obj = await fetchData(entityIdValue, selectedInterval, startTime, endTime);
            console.log('obj data ',obj);
            // check if there is data or not 
            if(obj && obj.labels.length > 0){
                await setGraphData(obj);
            }else {
                setNoChartData(true);
            }
        } else {
            setNoChartData(true);
        }
    };

    const fetchAssets = async (assetId: string) => {
        try {
            const attributeIds: string[] = [];
            const response = await axios.get(API_URL + `/asset/${assetId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            const assetData: Asset = response.data;

            Object.keys(assetData).map((key) => {
                if (key.includes("fields")) {
                    const newKey = 'eq.' + key;
                    attributeIds.push(newKey);
                }
            });
            return attributeIds;
        } catch (error) {
            console.error("Error fetching asset data:", error);
        }
    };

    const onButtonSelect = () => {
        if(selectedInterval == 'days'){
            let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
            let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
            fetchDataAndAssign(startTime, endTime);
        }else if(selectedInterval == 'weeks'){
            if(selectedWeekSubInterval == 'months'){
                let startTime = moment(startMonth).startOf('month').format('YYYY-MM-DD[T]HH:mm:ss');
                let endTime = moment(startMonth).endOf('month').format('YYYY-MM-DD[T]HH:mm:ss');
                fetchDataAndAssign(startTime, endTime);
            }else if(selectedWeekSubInterval == 'all'){
                let startTime = moment(startYear).startOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
                let endTime = moment(startYear).endOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
                fetchDataAndAssign(startTime, endTime);
            }else{
                let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
                let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
                fetchDataAndAssign(startTime, endTime);
            }
        }else{
            if(selectedMonthSubInterval == 'all'){
                let startTime = moment(startYear).startOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
                let endTime = moment(startYear).endOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
                fetchDataAndAssign(startTime, endTime);
            }else{
                let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
                let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
                fetchDataAndAssign(startTime, endTime);
            }
        }
    }
  
    //Set to default value when interval changes 
    useEffect(() => {
        setStartDate(moment().subtract(5, 'days').toDate());
        setEndDate(moment().toDate());
        setStartMonth(moment().startOf('month').toDate());
        setStartYear(moment().startOf('year').toDate());
    }, [selectedInterval]);

    useEffect(() => {
        let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
    },[entityIdValue])

    useEffect(() => {
        const containerBody = document.querySelector('.containerBody');
        if (containerBody && chartData.labels.length > 7) {
            const newWidth = 1000 + ((chartData.labels.length - 7) * 100);
            containerBody.style.width = `${newWidth}px`;
        }
    }, [chartData]);

    return (
        <div className="card h-auto" style={{ width: "100%" }}>
            <Toast ref={toast} />
            <h3 style={{ marginLeft: "30px", fontSize: "20px" }}>Power Consumption and Co2 Emission</h3>
            <div className="interval-filter-container">
                <p>Filter Interval</p>
            </div>
            <div className="flex align-items-center justify-content-center" >
                <div className="dropdown-container custom-button" style={{ marginRight: "30px", flexDirection: "column", alignItems: "center" }}>
                    <p>Type</p>
                    <Dropdown
                        value={selectedInterval}
                        options={intervalButtons.map(({ label, interval }) => ({
                            label,
                            value: interval,
                        }))}
                        onChange={(e) => setSelectedInterval(e.value)}
                        placeholder="Select an Interval"
                        style={{ width: "100%" }}
                    />
                </div>
                {
                    selectedInterval == 'days' ? 
                    <>
                        <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <p>Start Time</p>
                            <Calendar
                                value={startDate}
                                onChange={(e) => setStartDate(e.value ? moment(e.value).toDate() : null)}
                                minDate= {minimumDate ? moment(minimumDate).toDate() : undefined}
                                maxDate={moment().toDate()}
                            />
                        </div>
                        
                        <div className="end-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <p>End Time</p>
                            <Calendar
                                value={endDate}
                                onChange={(e) => setEndDate(e.value ? moment(e.value).toDate() : null)}
                                minDate={moment(startDate).toDate()}
                                maxDate={moment().toDate()}
                            />
                        </div>
                    </>
                    : selectedInterval == 'weeks' ? (
                        <>
                            <div className="dropdown-container custom-button" style={{ marginRight: "30px", flexDirection: "column", alignItems: "center" }}>
                                <p>Interval</p>
                                <Dropdown
                                    value={selectedWeekSubInterval}
                                    options={weekSubIntervalButtons.map(({ label, interval }) => ({
                                        label,
                                        value: interval,
                                    }))}
                                    onChange={(e) => setSelectedWeekSubInterval(e.value)}
                                    placeholder="Select Sub Interval"
                                    style={{ width: "100%" }}
                                />
                            </div>
                            
                            {
                                selectedWeekSubInterval == 'months' ? 
                                    <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <p>Months</p>
                                        <Calendar
                                            value={startMonth}
                                            onChange={(e) => setStartMonth(e.value ? moment(e.value).toDate() : null)}
                                            view="month" 
                                            dateFormat="mm/yy"
                                            minDate= {minimumDate ? moment(minimumDate).startOf('month').toDate() : undefined}
                                            maxDate={moment().startOf('month').toDate()}
                                        />
                                    </div>
                                : selectedWeekSubInterval == 'all' ?
                                (
                                    <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <p>Years</p>
                                        <Calendar
                                            value={startYear}
                                            onChange={(e) => setStartYear(e.value ? moment(e.value).toDate() : null)}
                                            view="year" 
                                            dateFormat="yy"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <p>Start Time</p>
                                            <Calendar
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.value ? moment(e.value).toDate() : null)}
                                                minDate= {minimumDate ? moment(minimumDate).toDate() : undefined}
                                                maxDate={moment().toDate()}
                                            />
                                        </div>
                                        
                                        <div className="end-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <p>End Time</p>
                                            <Calendar
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.value ? moment(e.value).toDate() : null)}
                                                minDate={moment(startDate).toDate()}
                                                maxDate={moment().toDate()}
                                            />
                                        </div>
                                    </>
                                )
                            }
                        </>
                    ) : (
                        <>
                            <div className="dropdown-container custom-button" style={{ marginRight: "30px", flexDirection: "column", alignItems: "center" }}>
                                <p>Interval</p>
                                <Dropdown
                                    value={selectedMonthSubInterval}
                                    options={monthSubIntervalButtons.map(({ label, interval }) => ({
                                        label,
                                        value: interval,
                                    }))}
                                    onChange={(e) => setSelectedMonthSubInterval(e.value)}
                                    placeholder="Select Sub Interval"
                                    style={{ width: "100%" }}
                                />
                            </div>
                            
                            {
                                selectedMonthSubInterval == 'all' ?
                                (
                                    <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <p>Years</p>
                                        <Calendar
                                            value={startYear}
                                            onChange={(e) => setStartYear(e.value ? moment(e.value).toDate() : null)}
                                            view="year" 
                                            dateFormat="yy"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="start-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <p>Start Time</p>
                                            <Calendar
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.value ? moment(e.value).toDate() : null)}
                                                minDate= {minimumDate ? moment(minimumDate).toDate() : undefined}
                                                maxDate={moment().toDate()}
                                            />
                                        </div>
                                        
                                        <div className="end-time-calendar" style={{ marginRight: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <p>End Time</p>
                                            <Calendar
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.value ? moment(e.value).toDate() : null)}
                                                minDate={moment(startDate).toDate()}
                                                maxDate={moment().toDate()}
                                            />
                                        </div>
                                    </>
                                )
                            }
                        </>
                    )
                }
                <Button label="Submit" onClick={onButtonSelect} style={{ marginTop: "3rem"}}/>   
            </div>
            {
                noChartData ?
                <div className="flex flex-column justify-content-center align-items-center"
                    style={{ marginTop: "5rem" }}
                >
                    <p> No chart data available</p>
                    <img src="/no-chart-data.png" alt="" width="5%" height="5%"  />
                </div>
                :
                isLoading ? (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "60vh",
                        }}
                    >
                        <ProgressSpinner />
                    </div>
                ) : (
                    <div style={{ overflowX: 'scroll', overflowY: 'hidden', maxWidth: '100%', width: '100%' }}>
                        <div className='containerBody'>
                            <Chart type="bar" data={chartData} options={chartOptions} />
                        </div>
                    </div>
                )
            }
        </div>
    )
};

export default PowerCo2Chart;