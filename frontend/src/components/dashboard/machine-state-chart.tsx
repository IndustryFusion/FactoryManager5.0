
// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { useEffect, useRef, useState } from "react";
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/types/asset-types";
import { useRouter } from "next/router";
import { convertToSecondsTime } from "@/utility/chartUtility";
import moment from 'moment';
import { useDashboard } from "@/context/dashboard-context";
import { Toast, ToastMessage } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import socketIOClient from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { create } from "@/redux/machineState/machineStateSlice";
import { useTranslation } from "next-i18next";

export interface Datasets {
    label?: string;
    data: number[];
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    tension?: number;
}

export interface pgData {
    prev_value: string;
    observedAt: string;
    attributeId: string;
    value: string;
    time: number;
    type: string;
}

interface GroupedData {
    time: number;
    type: string;
    prev_value?:string
    observedAt?:string;
    attributeId?:string, 
}

interface MachineState {
    id: string;
    days: Record<string, []>;
    weeks: Record<string, []>;
    months: Record<string, []>;
    [key: string]: {}; 
}

interface MachineStateLabelContext{
    dataset:{
        data:[]
    },
    dataIndex:number
};
type FinalData = Record<string,   {[key: string]: any} >;
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const SOCKET_API_URL = process.env.NEXT_PUBLIC_BACKEND_SOCKET_URL;

const MachineStateChart = () => {
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const [factoryData, setFactoryData] = useState({});
    const [lastData, setLastData] = useState<Record<string, any>>({});
    const [noChartData, setNoChartData] = useState(false);
    const router = useRouter();
    const { setMachineStateData,  setAllOnlineTime } = useDashboard();
    const entityIdValue = useSelector((state: RootState) => state.entityId.id);
    const machineStateData = useSelector((state: RootState) => state.machineState  as MachineState);
    const toast = useRef<Toast>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedInterval, setSelectedInterval] = useState<string>("days");
    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
    };
    const dispatch = useDispatch();
    const { t } = useTranslation('dashboard');
    const intervalButtons = [
        { label: "days", interval: "days" },
        { label: "weeks", interval: "weeks" },
        { label: "months", interval: "months" }
    ];

    const fetchDataAndAssign = async () => {
        let attributeId: string | undefined = await fetchAssets(entityIdValue);
        setNoChartData(false);
        if (entityIdValue && attributeId && attributeId.length > 0) {
            await fetchData(attributeId, `eq.${entityIdValue}`);
        } else {
            setNoChartData(true);
        }
    }

    const fetchData = async (attributeId: string, entityId: string) => {
        try {
            setLastData({});
            setFactoryData({});
            setIsLoading(true);
           
            if((machineStateData.id !== entityIdValue || selectedInterval == 'days') || (selectedInterval !== 'days' && Object.keys(machineStateData[selectedInterval]).length === 0)){
                let response = await axios.get(API_URL + `/value-change-state/chart`, {
                    params: {
                        attributeId,
                        'asset-id': entityId,
                        'type': selectedInterval
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
        
                let checkEmpty = true;
                for (const value of Object.values(response.data) as pgData[][]) {
                    if (value.length !== 0) {
                        checkEmpty = false;
                    }
                }
                
                if (checkEmpty) {
                    let lastDataResponse = await axios.get(API_URL + `/value-change-state`, {
                        params: {
                            attributeId,
                            entityId: entityId,     
                            order: "observedAt.desc",
                            limit: '1'
                        },
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        withCredentials: true,
                    });
                    if(Object.keys(lastDataResponse.data).length > 0 || lastDataResponse.data.length > 0){
                        setLastData(lastDataResponse.data);
                    } else {
                        setNoChartData(true);
                    }
                    
                  
                }
                setFactoryData(response.data);
                setMachineStateData(response.data);
                //set redux values for weeks and months
                if(selectedInterval == 'weeks'){
                    dispatch(create({
                        id: entityIdValue,
                        weeks: response.data,
                        months: machineStateData.months
                    }));
                }else if(selectedInterval == 'months'){
                    dispatch(create({
                        id: entityIdValue,
                        weeks: machineStateData.weeks,
                        months: response.data
                    }));
                }
            }else{
                if(selectedInterval == 'weeks'){
                    setFactoryData(machineStateData.weeks);
                }else if(selectedInterval == 'months'){
                    setFactoryData(machineStateData.months);
                }
            }
            setIsLoading(false);
          } catch (error) {
                if (axios.isAxiosError(error)) {
                    console.error("Error response:", error.response?.data.message);
                    showToast('error', 'Error', `Machine-state-data ${error.response?.data.message}`);
                } else if (error instanceof Error) {
                    console.error("Error:", error.message);
                    showToast('error', 'Error', error.message);
                } else {
                    console.error("Unknown error:", error);
                    showToast('error', 'Error', 'An unknown error occurred');
                }
            }

    };

    const fetchAssets = async (assetId: string) => {
        try {
            if (assetId) {
                let attributeId: string = '';
                const response = await axios.get(API_URL + `/asset/get-asset-by-id/${assetId}`, {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
                const assetData: Asset = response.data;

                Object.keys(assetData).map((key) => {
                    if (key.includes("machine_state")) {
                        attributeId = 'eq.' + key;
                    }
                });
                return attributeId;
            }
        } catch (error) {
            console.error("Error fetching asset data:", error);
        }
    };

    const formatChartData = (dataset: FinalData) => {

        const documentStyle = getComputedStyle(document.documentElement);
        let labels = Object.keys(dataset);
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
        }
        labels = labels?.reverse();
        for(let key in finalData){
            let data = finalData[key].data;
            finalData[key].data = data.reverse();
        }
        return {
            labels,
            datasets: finalData,
        };
    };

    const groupData = (data: FinalData): FinalData  => {
        let groupedByDate: { [key: string]: GroupedData[] } = {};
        const keys = Object.keys(data);
        let lastValue = "", nextValue = "";
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            groupedByDate[key] = [];
            if (data[key].length > 0) {
                lastValue = data[key][data[key].length - 1].value;
                let startTime = data[key][0].observedAt.split('T')[1].split('.')[0];
                if(data[key][0].prev_value){
                    groupedByDate[key].push({
                        time: convertToSecondsTime(startTime),
                        type: data[key][0].prev_value == '0' ? 'offline' : 'online'
                    })
                }
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
                                type
                            })
                        }
                    }

                    let startTime = data[key][data[key].length - 1].observedAt.split('T')[1].split('.')[0];
                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let endTime = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    let type = data[key][data[key].length - 1].value == '0' ? 'offline' : 'online'
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
                            type
                        })
                    }
                } else {
                    const dateToCheck = moment(key);
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let endTime = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    groupedByDate[key].push({
                        time: difference,
                        type: data[key][0].value == '0' ? 'offline' : 'online'
                    })
                }
            } else {
                const dateToCheck = moment(key);
                const currentDate = moment().startOf('day');
                const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                let time = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];

                if(Object.keys(lastData).length > 0){
                    groupedByDate[key].push({
                        time: convertToSecondsTime(time),
                        type: lastData['value'] == '0' ? 'offline' : 'online'
                    }, {
                        time: 0,
                        type: lastData['value'] == '0' ? 'online' : 'offline'
                    });
                }else{
                    if(lastValue.length > 0){
                        groupedByDate[key].push({
                            time: convertToSecondsTime(time),
                            type: lastValue == '0' ? 'offline' : 'online'
                        }, {
                            time: 0,
                            type: lastValue == '0' ? 'online' : 'offline'
                        });
                    } else {
                        if(nextValue !== null){
                            if(nextValue.length > 0){
                                groupedByDate[key].push({
                                    time: convertToSecondsTime(time),
                                    type: nextValue == '0' ? 'offline' : 'online'
                                }, {
                                    time: 0,
                                    type: nextValue == '0' ? 'online' : 'offline'
                                });
                            }else{
                                for (let j = i + 1; j < keys.length; j++) {
                                    let key2 = keys[j];
                                    if (data[key2].length > 0) {
                                        nextValue = data[key2][0].prev_value;
                                        if(nextValue){
                                            groupedByDate[key].push({
                                                time: convertToSecondsTime(time),
                                                type: data[key2][0].prev_value == '0' ? 'offline' : 'online'
                                            }, {
                                                time: 0,
                                                type: data[key2][0].prev_value == '0' ? 'online' : 'offline'
                                            });
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return groupedByDate;
    };

    const groupByDays =  (data: FinalData): { [key: string]: GroupedData[] } => {
        let groupedByDate: { [key: string]: GroupedData[] } = {};
        const keys = Object.keys(data);
        let lastValue = "", nextValue = "";
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            groupedByDate[key] = [];
            if (data[key].length > 0) {
                lastValue = data[key][data[key].length - 1].value;
                let startTime;
                if(selectedInterval == 'weeks'){
                    startTime = moment(moment(key.split(' ').pop()).startOf('day').format().split('+')[0]);
                } else{
                    startTime = moment(key, 'MMMM YYYY').startOf('month').format('YYYY-MM-DDTHH:mm:ss');
                }
                let endTime = moment(data[key][0].observedAt.split('.')[0]);
                const differenceInSeconds = endTime.diff(startTime, 'seconds');
                if(data[key][0].prev_value){
                    groupedByDate[key].push({
                        time: differenceInSeconds,
                        type: data[key][0].prev_value == '0' ? 'offline' : 'online'
                    })
                }
                if (data[key].length > 1) {
                    for (let idx = 1; idx < data[key].length; idx++) {
                        let startTime = moment(data[key][idx - 1].observedAt.split('.')[0]);
                        let endTime = moment(data[key][idx].observedAt.split('.')[0]);
                        const differenceInSeconds = endTime.diff(startTime, 'seconds');
                        let type = data[key][idx - 1].value == '0' ? 'offline' : 'online';
                        let check = false;
                        groupedByDate[key].forEach(obj => {
                            if (obj.type == type) {
                                obj.time = obj.time + differenceInSeconds;
                                check = true;
                            }
                        })
                        if (!check) {
                            groupedByDate[key].push({
                                time: differenceInSeconds,
                                type
                            })
                        }
                    }
    
                    let startTime = moment(data[key][data[key].length - 1].observedAt.split('.')[0]), differenceInSeconds: number;
                    if(selectedInterval == 'weeks'){
                        let weekStart = key.split(' ').pop();
                        let startOfWeek  = moment(weekStart).startOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        let endOfWeek  = moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                        let endTime = moment(currentTime).isBetween(startOfWeek, endOfWeek, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        differenceInSeconds = moment(endTime).diff(startTime, 'seconds');
                    } else{
                        const startOfMonth = moment(key, 'MMMM YYYY').startOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        let endOfMonth  = moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                        let endTime = moment(currentTime).isBetween(startOfMonth, endOfMonth, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        differenceInSeconds = moment(endTime).diff(startTime, 'seconds');
                    }
                    
                    let type = data[key][data[key].length - 1].value == '0' ? 'offline' : 'online'
                    let check = false;
                    groupedByDate[key].forEach(obj => {
                        if (obj.type == type) {
                            obj.time = obj.time + differenceInSeconds;
                            check = true;
                        }
                    })
                    if (!check) {
                        groupedByDate[key].push({
                            time: differenceInSeconds,
                            type
                        })
                    }
                } else {
                    let differenceInSeconds: number;
                    if(selectedInterval == 'weeks'){
                        let weekStart = key.split(' ').pop();
                        let startOfWeek  = moment(weekStart).startOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        let endOfWeek  = moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                        let startTime = moment(data[key][0].observedAt.split('.')[0]);
                        let endTime = moment(currentTime).isBetween(startOfWeek, endOfWeek, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                        differenceInSeconds = moment(endTime).diff(startTime, 'seconds');
                    } else{
                        const startOfMonth = moment(key, 'MMMM YYYY').startOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        let endOfMonth  = moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        let startTime = moment(data[key][0].observedAt.split('.')[0]);
                        let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                        let endTime = moment(currentTime).isBetween(startOfMonth, endOfMonth, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                        differenceInSeconds = moment(endTime).diff(startTime, 'seconds');
                    }
                    let type = data[key][0].value == '0' ? 'offline' : 'online';
                    let check = false;
                    groupedByDate[key].forEach(obj => {
                        if (obj.type == type) {
                            obj.time = obj.time + differenceInSeconds;
                            check = true;
                        }
                    })
                    if (!check) {
                        groupedByDate[key].push({
                            time: differenceInSeconds,
                            type
                        })
                    }
                }
            } else {
                let differenceInSeconds: number;
                if(selectedInterval == 'weeks'){
                    let weekStart = key.split(' ').pop();
                    let startOfWeek  = moment(weekStart).startOf('week').format('YYYY-MM-DDTHH:mm:ss');
                    let endOfWeek  = moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                    let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                    let endTime = moment(currentTime).isBetween(startOfWeek, endOfWeek, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(weekStart).endOf('week').format('YYYY-MM-DDTHH:mm:ss');
                    differenceInSeconds = moment(endTime).diff(startOfWeek, 'seconds');
                } else{
                    const startOfMonth = moment(key, 'MMMM YYYY').startOf('month').format('YYYY-MM-DDTHH:mm:ss');
                    let endOfMonth  = moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                    let currentTime = moment().format('YYYY-MM-DDTHH:mm:ss');
                    let endTime = moment(currentTime).isBetween(startOfMonth, endOfMonth, undefined, '[]') ? moment().format('YYYY-MM-DDTHH:mm:ss') : moment(key, 'MMMM YYYY').endOf('month').format('YYYY-MM-DDTHH:mm:ss');
                    differenceInSeconds = moment(endTime).diff(startOfMonth, 'seconds');
                }
    
                if(Object.keys(lastData).length > 0){
                    groupedByDate[key].push({
                        time: differenceInSeconds,
                        type: lastData['value'] == '0' ? 'offline' : 'online'
                    }, {
                        time: 0,
                        type: lastData['value'] == '0' ? 'online' : 'offline'
                    });
                } else {
                    if(lastValue.length > 0){
                        groupedByDate[key].push({
                            time: differenceInSeconds,
                            type: lastValue == '0' ? 'offline' : 'online'
                        }, {
                            time: 0,
                            type: lastValue == '0' ? 'online' : 'offline'
                        });
                    }else{
                        if(nextValue !== null){
                            if(nextValue.length > 0){
                                groupedByDate[key].push({
                                    time: differenceInSeconds,
                                    type: nextValue == '0' ? 'offline' : 'online'
                                }, {
                                    time: 0,
                                    type: nextValue == '0' ? 'online' : 'offline'
                                });
                            }else{
                                for (let j = i + 1; j < keys.length; j++) {
                                    let key2 = keys[j];
                                    if (data[key2].length > 0) {
                                        nextValue = data[key2][0].prev_value;
                                        if(nextValue){
                                            groupedByDate[key].push({
                                                time: differenceInSeconds,
                                                type: data[key2][0].prev_value == '0' ? 'offline' : 'online'
                                            }, {
                                                time: 0,
                                                type: data[key2][0].prev_value == '0' ? 'online' : 'offline'
                                            });
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return groupedByDate;
    };

    const alignData = (data:  FinalData) => {
        setLastData({});
        if(selectedInterval == 'days'){
            const finalData:FinalData = {} ;
            for(let key in data){
                const dateObject = moment(key, 'MMMM Do');
                const day = moment(dateObject).format('YYYY-MM-DD');
                finalData[day] = data[key];
            }
            let result = groupData(finalData);
            return result;
        }else{
            let result = groupByDays(data); 
            return result;
        }
    };

    // useEffect to handle socket receiving data
    useEffect(() => {
        const socket = socketIOClient(`${SOCKET_API_URL}/`);
        socket.on("connect", () => {
            console.log('WebSocket Connected machine-state-chart.tsx');
        });
 
        socket.on("valueChangeState", (newData) => {
            if(selectedInterval == 'days'){
                setFactoryData(newData);
            }
        });
        return () => {
            socket.disconnect();
        };
    },[])

    // useEffect to handle changes related to selectedIntervals
    useEffect(() => {
        if (router.isReady) {              
            fetchDataAndAssign();
        }
       
    }, [router.isReady, entityIdValue, selectedInterval])

    // useEffect to create chart data and when there is a update in data
    useEffect(() => {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        if(Object.keys(factoryData).length > 0){
            const groupedData:FinalData = alignData(factoryData);
            const chartDataValue = formatChartData(groupedData);
            const {datasets} = chartDataValue;
            for(let i in datasets){
                if(datasets[i].label === "online")
                setAllOnlineTime(datasets[i]?.data);
            }
            setChartData(chartDataValue);
            
            if(selectedInterval == 'days'){
                const options = {
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    aspectRatio: 0.8,
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context:MachineStateLabelContext) => {
                                    const { dataset, dataIndex } = context;
                                    const value = dataset.data[dataIndex];
                                    if (value > 0) {
                                        let duration = moment.duration(value, 'seconds'); 
                                        let hours = duration.hours();
                                        let minutes = duration.minutes();
                                        let seconds = duration.seconds();
                                        return `${hours}H ${minutes}M ${seconds}S`;
                                    } else {
                                        return '';
                                    }
                                },
                            },
                        },
                        datalabels: {
                            color: '#fff', // Customize the color of the labels
                            align: 'center', // Align the labels to the center of the bars
                            anchor: 'center', // Anchor the labels to the end of the bars
                            formatter: (value:number) => {
                                const totalSeconds = value;
                                if (!totalSeconds) {
                                    return '';
                                }
                                let duration = moment.duration(value, 'seconds'); 
                                let hours = duration.hours();
                                let minutes = duration.minutes();
                                let seconds = duration.seconds();
                                return `${hours}H ${minutes}M ${seconds}S`;
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
                                callback: (value:number) => {
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
                setChartOptions(options);
            }else if(selectedInterval == 'weeks'){
                const options = {
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    aspectRatio: 0.8,
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context:MachineStateLabelContext) => {
                                    const { dataset, dataIndex } = context;
                                    const value = dataset.data[dataIndex];
                                    if (value > 0) {
                                        let duration = moment.duration(value, 'seconds'); 
                                        let days = duration.days();
                                        let hours = duration.hours();
                                        let minutes = duration.minutes();
                                        return `${days}D ${hours}H ${minutes}M`;
                                    } else {
                                        return '';
                                    }
                                },
                            },
                        },
                        datalabels: {
                            color: '#fff', // Customize the color of the labels
                            align: 'center', // Align the labels to the center of the bars
                            anchor: 'center', // Anchor the labels to the end of the bars
                            formatter: (value:number) => {
                                const totalSeconds = value;
                                if (!totalSeconds) {
                                    return '';
                                }
                                let duration = moment.duration(totalSeconds, 'seconds'); 
                                let days = duration.days();
                                let hours = duration.hours();
                                let minutes = duration.minutes();
                                return `${days}D ${hours}H ${minutes}M`;
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
                                callback: (value:number) => {
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
                setChartOptions(options);
            }else {
                const options = {
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    aspectRatio: 0.8,
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context:MachineStateLabelContext) => {
                                    const { dataset, dataIndex } = context;
                                    const value = dataset.data[dataIndex];
                                    if (value > 0) {
                                        let duration = moment.duration(value, 'seconds'); 
                                        let days = duration.days();
                                        let hours = duration.hours();
                                        let minutes = duration.minutes();
                                        return `${days}D ${hours}H ${minutes}M`;
                                    } else {
                                        return '';
                                    }
                                },
                            },
                        },
                        datalabels: {
                            color: '#fff', // Customize the color of the labels
                            align: 'center', // Align the labels to the center of the bars
                            anchor: 'center', // Anchor the labels to the end of the bars
                            formatter: (value:number) => {
                                const totalSeconds = value;
                                if (!totalSeconds) {
                                    return '';
                                }
                                let duration = moment.duration(totalSeconds, 'seconds'); 
                                let days = duration.days();
                                let hours = duration.hours();
                                let minutes = duration.minutes();
                                return `${days}D ${hours}H ${minutes}M`;
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
                                callback: (value:number) => {
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
                setChartOptions(options);
            }
        }
    },[factoryData])
    
    return (
        <div className="card h-auto" style={{ width: "37%" }}>
            <Toast ref={toast} />
            <h5 className="heading-text">Machine State Overview</h5>
            <div className="interval-filter-container">
                <p>{t('filterInterval')}</p>
                {/* <div
                    className="dropdown-container custom-button"
                    style={{ padding: "0" , width:"100px"}}
                > */}
                     <div className="flex justify-content-between align-items-center dashboard-dropdown"
                     style={{width: "100px",
                        marginTop: "1rem"}}
                     >
                <Dropdown
                        value={selectedInterval}
                        options={intervalButtons.map(({ label, interval }) => ({
                            label,
                            value: interval,
                        }))}
                        onChange={(e) => setSelectedInterval(e.value)}
                        placeholder="Select an Interval"
                      
                        appendTo="self"
                    />
                <img
                  className="dropdown-icon-img"
                  src="/dropdown-icon.svg"
                  alt="dropdown-icon"
                />
              </div>
                {/* </div> */}
            </div>
            {
                 noChartData ?
                    <div className="flex flex-column justify-content-center align-items-center"
                        style={{ marginTop: "9rem" }}
                    >
                        <p>{t('nochartData')}</p>
                        <img src="/no-chart-data.png" alt="" width="8%" height="8%" />
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

export default MachineStateChart;