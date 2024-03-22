
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ChartData, ChartOptions } from 'chart.js';
import type { ChartOptionsState } from '../../pages/factory-site/types/Layout';
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/interfaces/AssetTypes";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { convertToSecondsTime } from "@/utility/chart-utility";

import moment from 'moment';

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

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const DashboardChart = () => {
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const [factoryData, setFactoryData] = useState({});
    const [checkFactory, setCheckFactory] = useState(false);
    const router = useRouter();

    const fetchDataAndAssign = async () => {
        let entityId = 'urn:ngsi-ld:asset:2:312';
        let attributeIds: string[] | undefined = await fetchAssets(entityId);

        if (attributeIds && attributeIds.length > 0) {
            await fetchData(attributeIds[2], 'eq.' + entityId);
        } else {
            console.log('No attribute set available');
        }
    }

    const fetchData = async (attributeId: string, entityId: string) => {
        try {
            const finalData = {}; 
            const day = moment().subtract(6, 'days').startOf('day');
            let startTime = day.format().split('+')[0] + '-00:00';
            let endTime = moment().format().split('+')[0] + '-00:00';
            const response = await axios.get(API_URL + `/value-change-state`, {
                params: {
                    attributeId: attributeId,
                    entityId: entityId,
                    observedAt_gte: startTime,
                    observedAt_lte: endTime
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });

            for (let i = 6; i >= 0; i--) {
                const day = moment().subtract(i, 'days').startOf('day').format().split('T')[0];
                finalData[day] = [];
                response.data.forEach(data => {
                    if(data.observedAt.includes(day))
                    {
                        finalData[day].push(data);
                    }
                })
            }
            console.log('factoryData ', finalData);
            setFactoryData(finalData);
            setCheckFactory(true);
        } catch (error) {
            console.error("Error fetching asset data:", error);
            throw error;
        }
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
            console.log(assetData, "what's the data");

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
        console.log(dataset, "what's the dataset here");
        
        const labels = Object.keys(dataset);
        const finalData = [];
        for(let key in dataset){
            let eachDateArr = dataset[key];
            for(let i = 0; i < eachDateArr.length; i++){
                let check = false;
                for(let idx = 0; idx < finalData.length; idx++){
                    if(finalData[idx].label == eachDateArr[i].type){
                        finalData[idx].data.push(eachDateArr[i].time);
                        check = true;
                    }
                }
                if(!check){
                    finalData.push({
                        label: eachDateArr[i].type,
                        backgroundColor: eachDateArr[i].type.includes('online') ? documentStyle.getPropertyValue('--green-400') : documentStyle.getPropertyValue('--red-400'),
                        data: [eachDateArr[i].time]
                    })
                }
            }
        }
        console.log('dataSet ',finalData);
        console.log('labels ',labels);
        return {
            labels,
            datasets: finalData,
        };
    };

    const groupData = (data: any) => {
        let groupedByDate = {};
        const keys = Object.keys(data);
        for(let i = 0; i < keys.length; i++){
            const key = keys[i];
            groupedByDate[key] = [];
            if(data[key].length > 0){
                let startTime = data[key][0].observedAt.split('T')[1].split('.')[0];
                groupedByDate[key].push({
                    time: convertToSecondsTime(startTime),
                    type: data[key][0].prev_value == '0'? 'offline': 'online',
                    date: key
                })
                if(data[key].length > 1){
                    for(let idx = 1; idx < data[key].length; idx++){
                        let startTime = data[key][idx-1].observedAt.split('T')[1].split('.')[0];
                        let endTime = data[key][idx].observedAt.split('T')[1].split('.')[0];
                        const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                        let type = data[key][idx-1].value == '0'? 'offline': 'online';
                        let check = false;
                        groupedByDate[key].forEach(obj => {
                            if(obj.type == type){
                                obj.time = obj.time + difference;
                                check = true;
                            }
                        })
                        if(!check){
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
                    console.log('endTime ',endTime)
                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    console.log('end difference ',difference);
                    let type = data[key][data[key].length - 1].value == '0'? 'offline': 'online'
                    let check = false;
                    groupedByDate[key].forEach(obj => {
                        if(obj.type == type){
                            obj.time = obj.time + difference;
                            check = true;
                        }
                    })
                    if(!check){
                        console.log('check fail ',difference);
                        groupedByDate[key].push({
                            time: difference,
                            type,
                            date: key
                        })
                    }
                }else{
                    const dateToCheck = moment(key); 
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let endTime = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    const difference = Math.abs(convertToSecondsTime(endTime) - convertToSecondsTime(startTime));
                    groupedByDate[key].push({
                        time: difference,
                        type: data[key][0].value == '0'? 'offline': 'online',
                        date: key
                    })
                }
            } else{
                let check = false;
                for(let j = i+1; j < keys.length; j++){
                    let key2 = keys[j];
                    const dateToCheck = moment(key); 
                    const currentDate = moment().startOf('day');
                    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                    let time = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                    if(data[key2].length > 0){
                        groupedByDate[key].push({
                            time: convertToSecondsTime(time),
                            type: data[key2][0].prev_value == '0'? 'offline': 'online',
                            date: key
                        },{
                            time: 0,
                            type: data[key2][0].prev_value == '0'? 'online': 'offline',
                            date: key
                        });
                        check = true;
                        break;
                    }
                }

                if(!check){
                    for(let j = i-1; j >= 0; j--){
                        let key2 = keys[j];
                        console.log('key2 ',key2);
                        const dateToCheck = moment(key); 
                        const currentDate = moment().startOf('day');
                        const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
                        let time = isCurrentDate ? moment().format('HH:mm:ss') : moment(key).endOf('day').format().split('T')[1].split('+')[0];
                        if(data[key2].length > 0){
                            groupedByDate[key].push({
                                time: convertToSecondsTime(time),
                                type: data[key2][data[key2].length - 1].value == '0'? 'offline': 'online',
                                date: key
                            },{
                                time: 0,
                                type: data[key2][data[key2].length - 1].value == '0'? 'online': 'offline',
                                date: key
                            });
                            check = true;
                            break;
                        }
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
                fetchDataAndAssign();

                const documentStyle = getComputedStyle(document.documentElement);
                const textColor = documentStyle.getPropertyValue('--text-color');
                const textColorSecondary = documentStyle.getPropertyValue(
                    '--text-color-secondary'
                );
                const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
                if(Object.keys(factoryData).length > 0){
                    const groupedData = groupData(factoryData);
                    console.log('groupedData ',groupedData);
                    const chartDataValue = formatChartData(groupedData);
                    console.log('chartDataValue ',chartDataValue);

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
                                        if(value > 0){
                                            const hours = Math.floor(value / 3600);
                                            const minutes = Math.floor((value % 3600) / 60);
                                            const seconds = value % 60;
                                            return `${hours.toString().padStart(2, '0')}:${minutes
                                                .toString()
                                                .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                        }else {
                                            return '';
                                        }
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
                }
            }
        }
    }, [router.isReady, checkFactory])

    return (
        <div className="card h-auto" style={{ width: "40%" }}>
            <h5 className="heading-text">Machine State Overview</h5>
            <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
    )
}

export default DashboardChart;