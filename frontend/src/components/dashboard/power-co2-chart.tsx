
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
const lastDataRef = useRef(null); // 
    // State and refs initialization remains the same

        useEffect(() => {
        const socket = socketIOClient(`${API_URL}/`);

        socket.on("connect", () => {
            console.log('WebSocket Connected');
        });

        socket.on("powerConsumptionUpdate", (newData) => {
            console.log("Data received from WebSocket:", newData);
            // Transform newData if necessary to match your chart's expected data structure
            
            // Compare the new data with the last data
            if (JSON.stringify(newData) !== JSON.stringify(lastDataRef.current)) {
                console.log("New data is different. Updating chart.");
                setChartData(newData); // Update your chart data state
                lastDataRef.current = newData; // Update the lastDataRef
            } else {
                console.log("Received data is the same as the last. No update needed.");
            }
        });

        return () => {
            socket.disconnect();
            console.log('WebSocket Disconnected');
        };
    }, []); // This effect runs once on mount

    const intervalButtons = [
        { label: "days", interval: "days" },
        { label: "weeks", interval: "weeks" },
        { label: "months", interval: "months" }
    ];

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
    };
  
    const fetchData = async () => {
        try {
            // console.log('entity id here ',entityIdValue);
            setIsLoading(true);
            const response = await axios.get(API_URL + '/power-consumption/chart', {
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
            console.log('response of powerconsumption chart ', response);
            setIsLoading(false);
            setCheckChart(true);
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

    useEffect(() => {
        const fetchDataAndAssign = async () => {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
            const obj = await fetchData();
            // console.log('obj datavalues ',obj);
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
                            color: textColor
                        }
                    },
                    datalabels: {                           
                        color: 'black', // Customize the color of the labels
                        align: 'end', // Align the labels to the end of the bars
                        anchor: 'center'
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: textColorSecondary,
                            stepSize: 25
                        },
                        grid: {
                            color: surfaceBorder
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: textColorSecondary,
                            stepSize: 10
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: surfaceBorder
                        }
                    }
                }
            };

            setChartData(data);
            setChartOptions(options);
            setNoChartData(false);
        }

        if (autorefresh === true) {
            intervalId.current = setInterval(() => {
                fetchDataAndAssign();
            }, 10000);
        } else {
            fetchDataAndAssign();
        }

        return () => {
            if (intervalId.current) {
                clearInterval(intervalId.current);
            }
        };

    }, [checkChart, entityIdValue, autorefresh, selectedInterval]);



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
            {isLoading ? (
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
            )}
        </div>
    )

};

export default PowerCo2Chart;