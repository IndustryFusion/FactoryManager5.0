
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ChartData, ChartOptions } from 'chart.js';
import type { ChartOptionsState } from '../../pages/factory-site/types/layout';
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/interfaces/assetTypes";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { calculateDifference, convertSecondstoTime, convertToSeconds, convertToSecondsTime, getDatesInRange, groupedByDate, machineData, mapBackendDataToAssetState } from "@/utility/chart-utility";


export interface Datasets {
    label?: string;
    data: number[];
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    tension?: number;
}

interface ChartDataState extends ChartData<"line", number[], string> {
    datasets: Datasets[];
}
export interface pgData {
    observedAt: string;
    attributeId: string;
    value: string;
}
interface DashboardChartProps {
    machineStateProp?: string;
    setMachineStateProp: Dispatch<SetStateAction<string>>;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const DashboardChart = () => {
    // const [chartData, setChartData] = useState<ChartData[]>([]);
    // const [options, setOptions] = useState<ChartOptionsState>({});
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const [documentStyle, setDocumentStyle] = useState(null);
    const router = useRouter();

    const fetchDataAndAssign = async () => {
        let entityId = 'urn:ngsi-ld:asset:2:101';
        let attributeIds: string[] | undefined = await fetchAssets(entityId);

        if (attributeIds)
            // console.log(attributeIds[2], "attributeId here")

            if (attributeIds && attributeIds.length > 0) {
                const datasetsArray = [];

                const { labels, datasets } = await fetchData(attributeIds[2], 'eq.' + entityId);
                // console.log('labels ', labels);

                const lineData: ChartData = {
                    labels,
                    datasets
                }
                setChartData(prevData => [...prevData, lineData]);

            } else {
                console.log('No attribute set available');
            }
        setOptions({
            lineOptions
        });
    }

    const fetchData = async (attributeId: string, entityId: string) => {
        const labelValue = attributeId ? String(attributeId.split("#").pop()) : "";
        const labels: string[] = [], datasets: Datasets[] = [
            {
                label: labelValue,
                data: [],
                fill: true,
                borderColor: '#4baaf5',
                backgroundColor: 'rgba(200, 230, 255, 0.5)',
                tension: 0.4
            }
        ];
        try {
            const response = await axios.get(API_URL + `/pgrest`, {
                params: {
                    // date: new Date(),
                    limit: 20,
                    order: 'observedAt.desc',
                    attributeId: encodeURIComponent(attributeId),
                    entityId
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });

            const factoryData = response.data;
            // console.log('factoryData ', factoryData);


            factoryData.forEach((data: pgData) => {
                const date = new Date(data.observedAt);
                const hours = date.getHours();
                const formattedDate = date.toISOString().slice(0, 16).replace('T', ' ');
                labels.push(formattedDate);
                datasets[0].data.push(Number(data.value));

            });
            return { datasets, labels };

        } catch (error) {
            console.error("Error fetching asset data:", error);
            throw error;
        }

    }
    const fetchAssets = async (assetId: string) => {
        console.log(assetId, "getting assetId")
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
            const updatedData = mapBackendDataToAssetState(response.data);
            // console.log(assetData, "what's the data");
            setMachineStateProp(updatedData["machine-state"])
            // setMachineState("0")

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
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else {
            if (router.isReady) {
                const { } = router.query;
                //fetchDataAndAssign();

            }
        }

    }, [router.isReady])

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    // Get an array of dates from today to 7 days ago
    const dateRange = getDatesInRange(sevenDaysAgo, today);
    const descendingDateRange = dateRange.reverse();

    const formatChartData = (dataset: any) => {
        const documentStyle = getComputedStyle(document.documentElement);
        const groupedByDate = dataset.reduce((acc, item) => {
            const date = Object.keys(item)[0];
            const onlineTimes = convertToSeconds(item[date].online);
            const offlineTimes = convertToSeconds(item[date].offline);
            const online_1Times = convertToSeconds(item[date].online_1);
            const offline_1Times = convertToSeconds(item[date].offline_1);

            // Flatten online, offline, online_1, and offline_1 times into a single array
            const times = [
                ...onlineTimes.map(time => ({ date, time, type: 'online' })),
                ...offlineTimes.map(time => ({ date, time, type: 'offline' })),
                ...online_1Times.map(time => ({ date, time, type: 'online_1' })),
                ...offline_1Times.map(time => ({ date, time, type: 'offline_1' }))
            ];
             times.sort((a, b) => b.time - a.time);

            // console.log("what's the times here", times);
            acc[date] = times;
            return acc;
        }, {});

    
        console.log(dataset, "what's the dataset here");
        console.log(groupedByDate, "what's this here in groupedbydate");
        // console.log("convert to array", Object.entries(groupedByDate));

        const labels = Object.keys(groupedByDate);
        let uniqueTypes;
        for(let date in groupedByDate){
            // console.log(date, "what's the datehere");
            uniqueTypes =  groupedByDate[date].map(item => item.type);
            // console.log(uniqueTypes, "what's here in uniqueTypes");
        }
      
        const datasets = uniqueTypes.map(type => {
            const dataValue = labels.flatMap(date => groupedByDate[date].filter(item => item.type === type).map(item => item.time))
            console.log(dataValue, "what's this here dataValue");
            console.log(labels, "what's in the labels");
            return {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                backgroundColor: type.includes('online') ? documentStyle.getPropertyValue('--green-400') : documentStyle.getPropertyValue('--red-400'),
                data: labels.flatMap(date => groupedByDate[date].filter(item => item.type === type).map(item => item.time))
            };
        });
                console.log(datasets, "what's in this datsets");

        return {
            labels,
            datasets,
        };
    };



    //bar chart data 
    useEffect(() => {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        const dataset = [
            {
                [descendingDateRange[0]]: {
                    online: ['12:00:00'],
                    offline: ['5:25:03'],
                    online_1: ['5:40:00'],
                    offline_1: ['4:07:67']

                }
            },
            {
                [descendingDateRange[1]]: {
                    online: ['3:08:27'],
                    offline: ['10:00:00'],
                    online_1: ['2:40:00'],
                    offline_1: ['7:07:67']
                }
            }
        ];

        const uniqueDates = [...new Set(machineData.map(item => item.observedAt.split('T')[0]))].sort((a, b) => b - a);

        // Format the grouped data into the desired structure
        const newDataset = uniqueDates.map(date => {
            return {
                [date]: {
                    offline: groupedByDate[date]?.offline || [],
                    online: groupedByDate[date]?.online || [],
                    // Assuming online_1 and offline_1 are additional values you want to include
                    online_1: [], // Example: Add your logic to populate these
                    offline_1: [] // Example: Add your logic to populate these
                }
            };
        });

        const chartDataValue = formatChartData(newDataset);
        // console.log(chartDataValue, "what's chartDtaValue");

        const options = {
            indexAxis: 'y',
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            const { dataset, dataIndex } = context;
                            // console.log(dataset, "what's in this");

                            const value = dataset.data[dataIndex];
                            const hours = Math.floor(value / 3600);
                            const minutes = Math.floor((value % 3600) / 60);
                            const seconds = value % 60;
                            return `${hours.toString().padStart(2, '0')}:${minutes
                                .toString()
                                .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        },
                    },
                },
                // legend: {
                //     labels: {
                //         color: textColor,
                //     },
                // },
            },
            scales: {
                y: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                    },
                },
                x: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                        suggestedMin: 0, // Assuming 0 is the minimum value
                        suggestedMax: 24 * 3600, // Assuming 24 hours is the maximum value in seconds
                        stepSize: 10800, // Step size in seconds (1 hour)
                        callback: (value: any) => {
                            // Convert seconds back to "hh:mm:ss" format for display
                            const hours = Math.floor(value / 3600);
                            const minutes = Math.floor((value % 3600) / 60);
                            const seconds = value % 60;

                            return `${hours === 0 ? 0 : hours}:${minutes.toString().padStart(2, '0')} `;
                        },
                    }

                },
            },
        };

        setChartData(chartDataValue);
        setChartOptions(options);
    }, []);


    return (
        <div className="card h-auto" style={{ width: "40%" }}>
            <h5 className="heading-text">Machine State Overview</h5>
            <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
    )
}

export default DashboardChart;