
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

interface PowerConsumptionUpdate {
  chartData: {
    labels: string[];
    powerConsumption: number[];
    emission: number[];
  };
  assetId: string;
  type: string;
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
    const { entityIdValue , autorefresh} = useDashboard();
    const [chartOptions, setChartOptions] = useState({});
    const [checkChart, setCheckChart] = useState<boolean>(false)
    const [selectedInterval, setSelectedInterval] = useState<string>("days");
    const [noChartData, setNoChartData] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const toast = useRef<any>(null);
    const intervalId: any = useRef(null);
    const lastDataRef:any = useRef(); // 
    // State and refs initialization remains the same

  useEffect(() => {
    const socket = socketIOClient(`${API_URL}/`);

    socket.on("connect", () => {
        console.log('WebSocket Connected');
    });

    socket.on("powerConsumptionUpdate", (newData) => {
        // console.log("Data received from WebSocket:", newData);

        // Make sure to check if the data structure is as expected
        // if (!newData || !newData.chartData || !newData.chartData.labels || !newData.chartData.powerConsumption) {
        //     console.error("Received data format is not correct");
        //     return;
        // }
    console.log("power data update ",newData)
       setChartData((currentData) => {
            const updatedChartData:any = { ...currentData };
            const currentDayIndex = newData.chartData.labels.length - 1;

            // Ensure datasets array exists and has necessary structure
            if (updatedChartData.datasets && updatedChartData.datasets.length >= 2) {
                updatedChartData.datasets[0].data[currentDayIndex] = newData.chartData.powerConsumption[currentDayIndex];
                updatedChartData.datasets[1].data[currentDayIndex] = newData.chartData.emission[currentDayIndex];
            } else {
                console.error("Datasets are not properly initialized");
            }

            // Update the ref for comparison in future updates
            lastDataRef.current = newData;

            // Log the index at which the data changed
            // console.log(`Data changed at index ${currentDayIndex}`);
            console.log(updatedChartData, "lllll")
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
        { label: "days", interval: "days" },
        { label: "weeks", interval: "weeks" },
        { label: "months", interval: "months" }
    ];

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
    };
  
    const fetchData = async (entityIdValue:any,selectedInterval:string) => {
        try {
            console.log('selectedInterval here ',selectedInterval);
            setIsLoading(true);
            const response = await axios.get(`${API_URL}/power-consumption/chart`, {
                params: {
                    'asset-id': entityIdValue,
                    'type': selectedInterval
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            console.log('response of powerconsumption chart ', response, selectedInterval);
            setIsLoading(false);
            // setCheckChart(true);
            setNoChartData(false);
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
  
useEffect(() => {
    // Define the fetchDataAndAssign function within the useEffect
    const fetchDataAndAssign = async () => {
        let attributeIds = await fetchAssets(entityIdValue);
        if (entityIdValue && attributeIds && attributeIds.length > 0 && attributeIds.includes("eq.http://www.industry-fusion.org/fields#power-consumption")) {
            await fetchData(`eq.${entityIdValue}`, selectedInterval);
            console.log('Fetching data for power consumption');
        } else {
            console.log('No attribute set available for power consumption');
            setNoChartData(true);
        }

        // Assume fetchData returns data required for updating chart
        const obj = await fetchData(entityIdValue, selectedInterval);
        const documentStyle = getComputedStyle(document.documentElement);

        const data = {
            labels: obj?.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Power Consumption (KW)',
                    backgroundColor: documentStyle.getPropertyValue('--green-400'),
                    yAxisID: 'y',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    data: obj?.powerConsumption,
                },
                {
                    type: 'bar',
                    label: 'CO2 Emission (KG)',
                    backgroundColor: documentStyle.getPropertyValue('--blue-500'),
                    yAxisID: 'y1',
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
                    anchor: 'center'
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
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        stepSize: 25,
                        color: documentStyle.getPropertyValue('--text-color-secondary')
                    },
                    grid: {
                        color: documentStyle.getPropertyValue('--surface-border')
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        stepSize: 10,
                        color: documentStyle.getPropertyValue('--text-color-secondary')
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: documentStyle.getPropertyValue('--surface-border')
                    }
                }
            }
        };

        setChartData(data);
        setChartOptions(options);
        setNoChartData(false);
    };

    fetchDataAndAssign();

    // Clean-up interval on unmount if autorefresh is true
    return () => {
        if (autorefresh && intervalId.current) {
            clearInterval(intervalId.current);
        }
    };
}, [entityIdValue, selectedInterval, autorefresh]); // Add autorefresh to dependencies if its state should trigger updates




    return (
        <div className="card h-auto" style={{ width: "100%" }}>
            <Toast ref={toast} />
            <h3 style={{ marginLeft: "30px", fontSize: "20px" }}>Power Consumption and Co2 Emission</h3>
            <div className="interval-filter-container">
                <p>Filter Interval</p>
                <div
                    className="dropdown-container custom-button"
                    style={{ padding: "0" }}
                >
                    <Dropdown
                        value={selectedInterval}
                        options={intervalButtons.map(({ label, interval }) => ({
                            label,
                            value: interval,
                        }))}
                        onChange={(e) => setSelectedInterval(e.value)}
                        placeholder="Select an Interval"
                        style={{ width: "100%", border: "none" }}
                    />
                </div>
            </div>
            {/* {isLoading ? (
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
                <Chart type="bar" data={chartData} options={chartOptions} />
            )} */}
              {
                 noChartData ?
                    <div className="flex flex-column justify-content-center align-items-center"
                        style={{ marginTop: "9rem" }}
                    >
                        <p> No data available</p>
                        <img src="/noDataFound.png" alt="" width="15%" height="15%" />
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
                        <Chart type="bar" data={chartData} options={chartOptions} />
                    )
            }
        </div>
    )

};

export default PowerCo2Chart;