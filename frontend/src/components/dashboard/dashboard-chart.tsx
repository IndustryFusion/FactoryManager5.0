
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Chart } from "primereact/chart";
import ChartJS from 'chart.js/auto';
import axios from "axios";
import { Asset } from "@/interfaces/asset-types";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { convertToSecondsTime, getAllDaysOfWeek } from "@/utility/chartUtility";
import moment from 'moment';
import { useDashboard } from "@/context/dashboard-context";
import { Toast, ToastMessage } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ProgressSpinner } from "primereact/progressspinner";
import { Context } from 'chartjs-plugin-datalabels';


// Chart.register(...registerables);
ChartJS.register(ChartDataLabels);

export interface Datasets {
    label?: string;
    data: number[];
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    tension?: number;
}

export interface pgData {
    observedAt: string;
    attributeId: string;
    value: string;
}

interface GroupedData {
    time: number;
    type: string;
    date: string;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const DashboardChart = () => {
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const [factoryData, setFactoryData] = useState({});
    const [lastData, setLastData] = useState({});
    const [checkFactory, setCheckFactory] = useState(false);
    const [noChartData, setNoChartData] = useState(false);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { entityIdValue, setMachineStateData, autorefresh, setAllOnlineTime } = useDashboard();
    const [selectedInterval, setSelectedInterval] = useState<string>("days");
    const [weeksResponse, setWeeksResponse] = useState({})
    const toast = useRef<any>(null);
    const intervalId: any = useRef(null);


    const intervalButtons = [
        { label: "days", interval: "days" },
        { label: "weeks", interval: "weeks" },
        { label: "months", interval: "months" }
    ];


    console.log("selectedInterval in machineChart", selectedInterval);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
    };

    const fetchDataAndAssign = async () => {
        let attributeIds: string[] | undefined = await fetchAssets(entityIdValue);

        if (attributeIds && attributeIds.length > 0 && attributeIds.includes("eq.http://www.industry-fusion.org/fields#machine-state")) {
            await fetchData("eq.http://www.industry-fusion.org/fields#machine-state", 'eq.' + entityIdValue);
        } else {
            setNoChartData(true);
            console.log('No attribute set available');
        }
    }

    const fetchData = async (attributeId: string, entityId: string) => {
        try {
            type DataType = any;
            const finalData: { [key: string]: DataType[] } = {};
            setIsLoading(true);
            let response = await axios.get(API_URL + `/value-change-state/chart`, {
                params: {
                    'asset-id': entityId,
                    'type': selectedInterval
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            setIsLoading(false);
            setWeeksResponse(response.data)
            console.log('response ', response.data);


            if (!(response.data.length > 0)) {
                response = await axios.get(API_URL + `/pgrest`, {
                    params: {
                        attributeId: attributeId,
                        entityId: entityId,
                        order: "observedAt.asc",
                        limit: '1'
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
                // console.log('response from else', response.data);
                // console.log("what's the value here in response", response.data[0].value);

                if (response.data[0].value) {
                    let responsePgrest = await axios.get(API_URL + `/pgrest`, {
                        params: {
                            attributeId: attributeId,
                            entityId: entityId,
                            order: "observedAt.desc",
                            limit: '1',
                            value: `neq.${response.data[0].value}`
                        },
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        withCredentials: true,
                    });
                    console.log(responsePgrest, "responsePgrest not value");

                }

                setLastData(response.data);
            }
            for (let i = 6; i >= 0; i--) {
                const day = moment().subtract(i, 'days').startOf('day').format().split('T')[0];
                   console.log(response.data , "for week data here");
                // console.log(day, "day here");
                finalData[day] = [];
                response.data.forEach((data: any) => {
                    if (data.observedAt.includes(day)) {
                        finalData[day].push(data);
                    }
                })
                console.log("finalData here", finalData);

            }

            // if (selectedInterval === "weeks") {
            //     console.log(weeksResponse, "here the weeks response");
            //     console.log("week keys", Object.keys(weeksResponse));
            //     let weeksKeys = Object.keys(weeksResponse);
            //     const weeksArray = [];
            //     const weeksObject = {};
            //     for (let i = 0; i <= weeksKeys.length - 1; i++) {
            //         let startWeekDate = weeksKeys[i].replace("Week ", "");
            //         const allDaysOfweek = getAllDaysOfWeek(startWeekDate);
            //         weeksObject[weeksKeys[i]] = allDaysOfweek;
            //         for (let i = 0; i <= allDaysOfweek.length - 1; i++) {
            //             const day = allDaysOfweek[i];
            //             finalData[day] = [];
            //             // console.log("here the last data we are getting", response.data);
            //             response.data.forEach((data: any) => {
            //                 if (data.observedAt.includes(day)) {
            //                     finalData[day].push(data);
            //                 }
            //             })
            //         }

            //     }
            //     weeksArray.push(weeksObject)

            //     const weekdata = getWeekHasData(weeksArray, finalData)
            //     console.log(weekdata, "is getting particular week");

            // }




            console.log('finaldata for days ', finalData);
            setNoChartData(false);
            setFactoryData(finalData);
            setMachineStateData(finalData)
            setCheckFactory(true);

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
                // showToast('error', 'Error', `Machine-state-data ${error.response?.data.message}`);
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        }
    }

    const getWeekHasData = (weeksArrayValue, finalDataValue) => {
        const result = [];
        for (const weekKey in weeksArrayValue[0]) {
            for (const arrayDate of weeksArrayValue[0][weekKey]) {
                if (finalDataValue[arrayDate] && finalDataValue[arrayDate].length > 0) {
                    const dateOfValue = moment(finalDataValue[arrayDate][0].observedAt).format('YYYY-MM-DD');
                    const time = finalDataValue[arrayDate][0].observedAt.split("T")[1].split(".")[0];
                    console.log(arrayDate === dateOfValue);

                    result.push({
                        weekKey: weekKey,
                        time: time
                    });
                }
            }
        }
        return result;
    }

    const fetchAssets = async (assetId: string) => {
        // console.log(assetId, "getting assetId")
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
            // console.log(assetData, "what's the data");

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

    const formatChartData = (dataset: any) => {
        const documentStyle = getComputedStyle(document.documentElement);
        // console.log(dataset, "what's the dataset here");

        console.log("is coming here in formatChartData", Object.keys(dataset));
        let labels;
        if (selectedInterval === "weeks") {
            //   labels=Object.keys(dataset).map(label => moment(label).format('YYYY-MM-DD'));
        } else {
            labels = Object.keys(dataset).map(label => moment(label).format('MMMM Do'));
        }


        const finalData = [];
        for (let key in dataset) {
            let eachDateArr = dataset[key];
            for (let i = 0; i < eachDateArr.length; i++) {
                let check = false;
                for (let idx = 0; idx < finalData.length; idx++) {
                    if (finalData[idx].label == eachDateArr[i].type) {
                        finalData[idx].data.push(eachDateArr[i].time);
                        check = true;
                    }
                }
                if (!check) {
                    finalData.push({
                        label: eachDateArr[i].type,
                        backgroundColor: eachDateArr[i].type.includes('online') ? documentStyle.getPropertyValue('--green-400') : documentStyle.getPropertyValue('--red-400'),
                        data: [eachDateArr[i].time]
                    })
                }
            }
        } console.log('dataSet all datavalues in macine chart ', finalData);

        console.log('labels ', labels);
        return {
            labels,
            datasets: finalData,
        };
    };

    const groupData = (data: any) => {
        let groupedByDate: { [key: string]: GroupedData[] } = {};
        const keys = Object.keys(data);
        console.log("keys in groupedData", keys);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            groupedByDate[key] = [];

            if (data[key].length > 0) {
                let startTime = data[key][0].observedAt.split('T')[1].split('.')[0];
                groupedByDate[key].push({
                    time: convertToSecondsTime(startTime),
                    type: data[key][0].prev_value == '0' ? 'offline' : 'online',
                    date: key
                })
                if (data[key].length > 1) {
                    for (let idx = 1; idx < data[key].length; idx++) {
                        let startTime = data[key][idx - 1].observedAt.split('T')[1].split('.')[0];
                        let endTime = data[key][idx].observedAt.split('T')[1].split('.')[0];
                        const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                        let type = data[key][idx - 1].value == '0' ? 'offline' : 'online';
                        let check = false;
                        groupedByDate[key].forEach(obj => {
                            if (obj.type == type) {
                                obj.time = obj.time + difference;
                                check = true;
                            }
                        })
                        if (!check) {
                            groupedByDate[key].push({
                                time: difference,
                                type,
                                date: key
                            })
                        }
                    }

                    let startTime = data[key][data[key].length - 1].observedAt.split('T')[1].split('.')[0];
                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let endTime = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    // console.log('endTime ', endTime)
                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    // console.log('end difference ', difference);
                    let type = data[key][data[key].length - 1].value == '0' ? 'offline' : 'online'
                    let check = false;
                    groupedByDate[key].forEach(obj => {
                        if (obj.type == type) {
                            obj.time = obj.time + difference;
                            check = true;
                        }
                    })
                    if (!check) {
                        console.log('check fail ', difference);
                        groupedByDate[key].push({
                            time: difference,
                            type,
                            date: key
                        })
                    }
                } else {
                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let endTime = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    console.log("endTime here", endTime);

                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    groupedByDate[key].push({
                        time: 86399,
                        type: data[key][0].value == '0' ? 'offline' : 'online',
                        date: key
                    })
                }
            }
            //change this logic - call pgrest with observedAt and with limit:2 and order:desc get last changed state
            //more the for loop-> time complexity increases
            else {
                console.log("is coming here");

                let check = false;
                for (let j = i + 1; j < keys.length; j++) {
                    let key2 = keys[j];
                    console.log("key here in else", key2);

                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let time = isCurrentDate ? moment().format('HH:mm:ss') :
                        "00:00:00";
                    console.log("time here", time);

                    if (data[key2].length > 0) {
                        groupedByDate[key].push({
                            time: convertToSecondsTime(time),
                            type: data[key2][0].prev_value == '0' ? 'offline' : 'online',
                            date: key
                        }, {
                            time: 0,
                            type: data[key2][0].prev_value == '0' ? 'online' : 'offline',
                            date: key
                        });

                        check = true;
                        break;
                    }
                }
                if (!check) {
                    for (let j = i - 1; j >= 0; j--) {
                        let key2 = keys[j];
                        // console.log('key2 ', key2);
                        const dateToCheck = moment(key);
                        const currentDate = moment().startOf('day');
                        const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                        let time = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                        if (data[key2].length > 0) {
                            groupedByDate[key].push({
                                time: convertToSecondsTime(time),
                                type: data[key2][data[key2].length - 1].value == '0' ? 'offline' : 'online',
                                date: key
                            }, {
                                time: 0,
                                type: data[key2][data[key2].length - 1].value == '0' ? 'online' : 'offline',
                                date: key
                            });
                            check = true;
                            break;
                        }
                    }
                }
                if (!check) {
                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let time = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    console.log(lastData, "lastData here");

                    if (Object.keys(lastData).length) {
                        groupedByDate[key].push({
                            time: convertToSecondsTime(time),
                            type: lastData['value'] == '0' ? 'offline' : 'online',
                            date: key
                        }, {
                            time: 0,
                            type: lastData['value'] == '0' ? 'online' : 'offline',
                            date: key
                        });
                    }
                }
            }
        }

        return groupedByDate;
    }

    useEffect(() => {
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else {
            if (router.isReady) {
                if (autorefresh === true) {
                    console.log("is machine-chart autoreferssh");
                    intervalId.current = setInterval(() => {
                        fetchDataAndAssign();
                    }, 10000);
                } else {
                    fetchDataAndAssign();
                }

                const documentStyle = getComputedStyle(document.documentElement);
                const textColor = documentStyle.getPropertyValue('--text-color');
                const textColorSecondary = documentStyle.getPropertyValue(
                    '--text-color-secondary'
                );
                const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

                if (Object.keys(factoryData).length > 0) {
                    const groupedData = groupData(factoryData);
                    const chartDataValue = formatChartData(groupedData);

                    const { datasets } = chartDataValue;
                    for (let i in datasets) {
                        if (datasets[i].label === "online")
                            setAllOnlineTime(datasets[i]?.data);
                    }
                    const options = {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        aspectRatio: 0.8,
                        plugins: {
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: (context: any) => {
                                        const { dataset, dataIndex } = context;
                                        const value = dataset.data[dataIndex];
                                        if (value > 0) {
                                            const hours = Math.floor(value / 3600);
                                            const minutes = Math.floor((value % 3600) / 60);
                                            const seconds = value % 60;
                                            return `${hours.toString().padStart(2, '0')}:${minutes
                                                .toString()
                                                .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                        } else {
                                            return '';
                                        }
                                    },
                                },
                            },
                            datalabels: {
                                color: '#fff', // Customize the color of the labels
                                align: 'end', // Align the labels to the end of the bars
                                anchor: 'center', // Anchor the labels to the end of the bars
                                formatter: (value) => {
                                    const totalSeconds = value;
                                    if (!totalSeconds) {
                                        return '';
                                    }
                                    const hours = Math.floor(totalSeconds / 3600);
                                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                                    const seconds = totalSeconds % 60;
                                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                }
                            }
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
                                    callback: (value) => {
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
                }
            }
        }
        return () => {
            if (intervalId.current) {
                clearInterval(intervalId.current);
            }
        };
    }, [router.isReady, checkFactory, entityIdValue, autorefresh, selectedInterval])


    return (
        <div className="card h-auto" style={{ width: "37%" }}>
            <Toast ref={toast} />
            <h5 className="heading-text">Machine State Overview</h5>
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
            {
                JSON.stringify(chartData) === "{}" || noChartData ?
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
}

export default DashboardChart;