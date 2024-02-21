import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ChartData, ChartOptions } from 'chart.js';
import type { ChartOptionsState } from '../../pages/factory-site/types/layout';
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/interfaces/assetTypes";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

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
    machineStateProp?:string;
    setMachineStateProp: Dispatch<SetStateAction<string>>;
  }

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const DashboardChart: React.FC<DashboardChartProps> = ({ setMachineStateProp}) => {
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [options, setOptions] = useState<ChartOptionsState>({});
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
        let entityId = 'urn:ngsi-ld:asset:2:602';
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

                // Check if the hour is a multiple of 3

                const formattedDate = date.toISOString().slice(0, 16).replace('T', ' ');
                // console.log(formattedDate, "what;s the date");

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
            const {} = router.query;
            fetchDataAndAssign();
            }
        }
    }, [router.isReady])


    return (
        <>
            <div className="col-12 xl:col-6 chart-content" style={{zoom:"80%"}}>
                <div className="card">
                <h5 className="heading-text">Machine State Overview</h5>
                    {chartData.map((value) => (
                        <Chart type="line" data={value} options={options.lineOptions}></Chart>
                    ))}
              
                </div>
            </div>
        </>
    )
}

export default DashboardChart;