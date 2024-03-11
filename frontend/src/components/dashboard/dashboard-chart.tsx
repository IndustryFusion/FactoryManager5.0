
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ChartData, ChartOptions } from 'chart.js';
import type { ChartOptionsState } from '../../pages/factory-site/types/layout';
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/interfaces/assetTypes";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { getDatesInRange } from "@/utility/chart-utility";

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

    const mapBackendDataToAssetState = (backendData: any) => {
        const modifiedObject: any = {};
        // Iterate over the properties of the object
        Object.keys(backendData).forEach((key) => {
            if (key.includes("http://www.industry-fusion.org/fields#")) {
                const newKey = key.replace("http://www.industry-fusion.org/fields#", "");
                modifiedObject[newKey] = backendData[key].type === "Property" ? backendData[key].value : backendData[key];
            } else {
                modifiedObject[key] = backendData[key];
            }
        });
        return modifiedObject;
    };

    const fetchDataAndAssign = async () => {
        let entityId = 'urn:ngsi-ld:asset:2:101';
        let attributeIds: string[] | undefined = await fetchAssets(entityId);
        const lineOptions: ChartOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                // x: {
                //   ticks: {
                //     autoSkip: false,
                //     maxTicksLimit: 20,
                //     callback: function (label, index, labels) {

                //       // Check if this is a tick we want to show based on the index
                //       if (index % 3 === 0) {
                //         // Parse the timestamp into a Date object
                //         const dateObj = new Date(label);
                //         // Format the date and time
                //         const formattedDate = dateObj.toLocaleDateString('en-US'); // Adjust for your locale
                //         const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                //         // Return the combined date and time string
                //         return `${formattedDate} ${formattedTime}`;
                //       } else {
                //         // For other ticks, return an empty string to hide them
                //         return '';
                //       }
                //     },
                //   },
                // }

                y: {
                    ticks: {

                        callback: function (value, index, values) {
                            if (value === 2) {
                                return 'Online';
                            } else if (index === 0) {
                                return 'Offline';
                            } else {
                                return;
                            }
                        }
                    }
                }
            }

        }
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

    const convertToSeconds = (timeData: any) => {
        const secondsData = timeData.map((time) => {
            const [hours, minutes, seconds] = time.split(':').map(Number);
            return hours * 3600 + minutes * 60 + seconds;
        });
        return secondsData;
    }


    // data mapping to chart based on each value of array to each day here
    // const onlineTimeData = ['12:10:58', '1:08:12', '2:08:27', '12:08:42', '4:08:57', '2:00:00', '13:00:43'];
    // const offlineTimeData = ['2:25:03', '5:09:89', '17:09:78', '5:00:00', '19:09:90', '1:00:00', '9:00:67'];
    // const realOfflineTimeData = ['14:25:03'];

    // const onlineData = convertToSeconds(onlineTimeData);
    // const offlineData = convertToSeconds(offlineTimeData);
    // const realOfflineTimeValues = convertToSeconds(realOfflineTimeData );


    const formatChartData = (dataset:any) => {
        const documentStyle = getComputedStyle(document.documentElement);
       // Flatten and group by date
    const groupedByDate = dataset.reduce((acc, item) => {
        const date = Object.keys(item)[0];
        const onlineTimes = convertToSeconds(item[date].online);
        const offlineTimes = convertToSeconds(item[date].offline);
        console.log(onlineTimes, "online time inside formatChartData");
        console.log(offlineTimes, "offline time inside formatChartDtaa");
        
        

        // Flatten online and offline times into a single array
        const times = [...onlineTimes, ...offlineTimes].map((time, index) => ({
            date,
            time,
            type: index < onlineTimes.length ? 'online' : 'offline',
        }));

        console.log(times , "what's the times");
        
        // Group by date
        acc[date] = times;
        return acc;
    }, {});

    console.log(groupedByDate, "what's in this groupedByDate");
    console.log("it's date values",  Object.keys(groupedByDate));
    
    console.log(dataset, "what's this dataset");
    

    // Format for Chart.js
    const labels = Object.keys(groupedByDate);
    const datasets = ['online','offline'].map((type) =>
    {
        console.log(type, "what's in this")
        return(
  
            {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                backgroundColor: type === 'online' ? documentStyle.getPropertyValue('--green-400') : documentStyle.getPropertyValue('--red-400'),
                data: labels.flatMap((date) => groupedByDate[date].filter(item => item.type === type).map(item => item.time))
            
            }
        )
    } );

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
            "11/03/2024": {
                online: ['2:00:00'],
                offline: ['4:25:03'],
                online_1: ['5:40:00'],
                offline_1:['7:07:67']
                
            }
        },
        {
            "10/03/2024": {
                online: ['9:08:27'],
                offline: ['12:00:00'],
                online_1: ['5:40:00'],
                offline_1:['7:07:67']
            }
        }
    ];
    
    const chartDataValue = formatChartData(dataset);
    // console.log(chartDataValue, "what all values are");

        // const data = {
        //     labels: descendingDateRange,
        //     datasets: [
        //         {
        //             type: 'bar',
        //             label: 'Online',
        //             backgroundColor: documentStyle.getPropertyValue('--green-400'),
        //             data: onlineData,
        //         },
        //         {
        //             type: 'bar',
        //             label: 'Offline',
        //             backgroundColor: documentStyle.getPropertyValue('--red-400'),
        //             data: offlineData,
        //         },
        //     ],
        // };
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
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
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
        <div className="card h-auto" style={{width:"40%"}}>
            <h5 className="heading-text">Machine State Overview</h5>
            <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
    )
}

export default DashboardChart;