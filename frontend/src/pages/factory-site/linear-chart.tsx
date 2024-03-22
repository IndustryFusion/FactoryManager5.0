'use client';
import { ChartData, ChartOptions } from 'chart.js';
import { Chart } from 'primereact/chart';
import React, { useContext, useEffect, useState } from 'react';
import { LayoutContext } from './layout/layout-context';
import type { ChartDataState, ChartOptionsState } from './types/layout';
import axios from 'axios';
import { Asset } from "@/interfaces/asset-types";
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

const ChartDemo = () => {
    const [options, setOptions] = useState<ChartOptionsState>({});
    const [data, setChartData] = useState<ChartData[]>([]);
    const { layoutConfig } = useContext(LayoutContext);

    const fetchData = async (attributeId: string, entityId: string) => {
        console.log('attributeId ',attributeId)
        console.log('entityId ',entityId)
        const documentStyle = getComputedStyle(document.documentElement);
        try {
            const labelValue = attributeId ? String(attributeId.split('#').pop()) : '';
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
            const response = await axios.get(API_URL + `/factory-manager`, {
              params: {
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
            console.log('response ',response)
            const factoryData = response.data;
            console.log('factoryData ',factoryData);
            factoryData.forEach((data: pgData) => {
                const date = new Date(data.observedAt);
                const formattedDate = date.toISOString().slice(0, 16).replace('T', ' ');
                labels.push(formattedDate);
                datasets[0].data.push(Number(data.value));
            });
            return {
                labels,
                datasets
            }
        } catch (error) {
            console.error("Error fetching asset data:", error);
            throw error;
        }
    }

    const fetchAsset = async (assetId: string) => {
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
        const fetchDataAndAssign = async () => {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#6c757d';
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#dfe7ef';
            const lineOptions: ChartOptions = {
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
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder
                        },
                        border: {
                            display: false
                        }
                    }
                }
            };
            let entityId = 'urn:ngsi-ld:asset:2:101';
            let attributeIds = await fetchAsset(entityId);
            if(attributeIds && attributeIds.length > 0) {
                for(let i = 0; i < attributeIds.length; i++ ) {
                    const { labels, datasets } = await fetchData(attributeIds[i], 'eq.' + entityId);
                    console.log('labels ',labels);
                    console.log('datasets ',datasets);
                    const lineData: ChartData = {
                        labels,
                        datasets
                    }
                    setChartData(prevData => [...prevData, lineData]);
                }
            } else {
                console.log('No attribute set available');
            }
            setOptions({
                lineOptions
            });
        }
        fetchDataAndAssign();
    }, [layoutConfig]);

    return (
           <>
                <h1 style={{marginLeft:"30px"}}>Linear Chart</h1>
                <div className="grid p-fluid">
                    {data.map((value) => (
                        <div className="col-12 xl:col-6">
                            <Chart type="line" data={value} options={options.lineOptions}></Chart>
                        </div> 
                    ))}
                </div>
        </>
    );
};

export default ChartDemo;
