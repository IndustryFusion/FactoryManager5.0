
import { Chart } from 'primereact/chart';
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useDashboard } from '@/context/dashboard-context';
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
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
    const { entityIdValue, setEntityIdValue } = useDashboard();
    const [chartOptions, setChartOptions] = useState({});
    const [loading, setLoading] = useState<boolean>(true);
    const [checkChart, setCheckChart] = useState<boolean>(false)

    const fetchData = async () => {
        try {
            const response = await axios.get(API_URL + '/power-consumption/chart', {
                params: {
                    'asset-id': entityIdValue,
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            console.log('response of powerconsumption chart ', response);
            setLoading(false);
            setCheckChart(true);
            return response.data;
        } catch (error) {
            console.error("Error fetching asset data:", error);
            throw error;
        }
    }

    useEffect(() => {
        const fetchDataAndAssign = async () => {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
            const obj = await fetchData();
            // console.log('obj ',obj);
            const data = {
                labels: obj.lastSevenDays,
                datasets: [
                    {
                        type: 'line',
                        label: 'CO2 Emission',
                        borderColor: documentStyle.getPropertyValue('--blue-500'),
                        yAxisID: 'y',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        data: obj.emission
                    },
                    {
                        type: 'bar',
                        label: 'Power Comsumption',
                        backgroundColor: documentStyle.getPropertyValue('--green-400'),
                        yAxisID: 'y1',
                        data: obj.powerConsumption,
                        borderColor: 'white',
                        borderWidth: 2
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
                        position: 'right',
                        ticks: {
                            color: textColorSecondary,
                            stepSize: 10000
                        },
                        grid: {
                            color: surfaceBorder
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: textColorSecondary,
                            stepSize: 50
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
        }
        fetchDataAndAssign();
    }, [checkChart, entityIdValue]);

    return (
        <div className="card h-auto" style={{ width: "100%" }}>
            {/* <BlockUI blocked={loading}> */}
            <h3 style={{ marginLeft: "30px", fontSize: "20px" }}>Power Consumption Vs Co2 Emission</h3>
            <Chart type="line" data={chartData} options={chartOptions} />
            {/* </BlockUI> */}
        </div>
    )
};

export default PowerCo2Chart;