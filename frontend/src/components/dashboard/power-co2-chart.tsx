
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

import { Chart } from 'primereact/chart';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ChartJS from 'chart.js/auto';
import { Toast, ToastMessage } from 'primereact/toast';
import { ProgressSpinner } from "primereact/progressspinner";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Dropdown } from "primereact/dropdown";
import { Asset } from "@/types/asset-types";
import moment from 'moment';
import { Calendar } from 'primereact/calendar';
import { Button } from "primereact/button";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { create } from "@/redux/powerConsumption/powerConsumptionSlice";
import { useTranslation } from "next-i18next";
import Image from 'next/image';

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

interface PowerConsumptionData {
  labels: string[];
  powerConsumption: number[];
  emission: number[];
}
const initialChartData = {
  labels: [],
  datasets: [
    { label: 'Power Consumption (KW)', data: [], fill: false, backgroundColor: 'rgba(75,192,192,0.4)', borderColor: 'rgba(75,192,192,1)', tension: 0.4 },
    { label: 'CO2 Emission (KG)', data: [], fill: false, backgroundColor: 'rgba(255,99,132,0.4)', borderColor: 'rgba(255,99,132,1)', tension: 0.4 },
  ],
};
const PowerCo2Chart = () => {
  const [chartData, setChartData] = useState<PowerConsumptionData | null>(null);
  const entityIdValue = useSelector((state: RootState) => state.entityId.id);
  const [chartOptions, setChartOptions] = useState({});
  const [selectedInterval, setSelectedInterval] = useState<string>("days");
  const [selectedWeekSubInterval, setSelectedWeekSubInterval] = useState<string>("months");
  const [selectedMonthSubInterval, setSelectedMonthSubInterval] = useState<string>("all");
  const [noChartData, setNoChartData] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(5, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(moment().toDate());
  const [startMonth, setStartMonth] = useState<Date | null>(moment().startOf('month').toDate());
  const [startYear, setStartYear] = useState<Date | null>(moment().startOf('year').toDate());
  const toast = useRef<Toast>(null);
  const dispatch = useDispatch();
  const { t } = useTranslation(['button', 'dashboard']);
  let minimumDate = useSelector((state: RootState) => state.powerConsumption.minimumDate);
  let reduxId = useSelector((state: RootState) => state.powerConsumption.id);

  const intervalButtons = [
    { label: t("dashboard:days"), interval: "days" },
    { label: t("dashboard:weeks"), interval: "weeks" },
    { label: t("dashboard:months"), interval: "months" }
  ];
  const weekSubIntervalButtons = [
    { label: t("dashboard:months"), interval: 'months' },
    { label: 'All', interval: 'all' },
    { label: 'Time', interval: 'time' }
  ];
  const monthSubIntervalButtons = [
    { label: 'All', interval: 'all' },
    { label: 'Time', interval: 'time' }
  ];

  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
  };

  const fetchData = async (entityIdValue: string, selectedInterval: string, startTime: string, endTime: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/power-consumption/chart`, {
        params: {
          'assetId': entityIdValue,
          'type': selectedInterval,
          startTime,
          endTime
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      if (reduxId !== entityIdValue) {
        const firstValueResponse = await axios.get(`${API_URL}/power-consumption`, {
          params: {
            entityId: `eq.${entityIdValue}`,
            limit: '1'
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        })

        if (firstValueResponse.data.labels.length > 0) {
          let date = moment(firstValueResponse.data.labels[0], 'MMM Do').format('YYYY-MM-DD');
          dispatch(create({
            minimumDate: date,
            id: entityIdValue
          }));
        }
      }
      setIsLoading(false);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data.message);
        showToast('warn', 'Warn', `Power consumption data: ${error.response?.data.message}`);
      } else {
        console.error("Error:", (error as Error).message);
        showToast('error', 'Error', (error as Error).message);
      }
    }
  }

  const setGraphData = async (obj: PowerConsumptionData) => {
    const documentStyle = getComputedStyle(document.documentElement);
    const data = {
      labels: obj?.labels,
      datasets: [
        {
          label: 'Power Consumption (kw/h)',
          backgroundColor: documentStyle.getPropertyValue('--green-400'),
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          data: obj?.powerConsumption,
        },
        {
          label: 'CO2 Emission (kg)',
          backgroundColor: documentStyle.getPropertyValue('--blue-500'),
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
          color: 'white',
          align: 'end',
          anchor: 'center',
          formatter: function (value: number, context: { datasetIndex: number }) {
            const datasetIndex = context.datasetIndex;
            if (datasetIndex === 0) {
              return `${value} kw/h`;
            } else if (datasetIndex === 1) {
              return `${value} kg`;
            }
          }
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

          display: true,
          ticks: {
            stepSize: 5,
            color: documentStyle.getPropertyValue('--text-color-secondary')
          },
          grid: {
            color: documentStyle.getPropertyValue('--surface-border')
          }
        }
      }
    };

    setChartData(data as unknown as PowerConsumptionData);
    setChartOptions(options);
  };

  const fetchDataAndAssign = async (startTime: string, endTime: string) => {
    let attributeId = await fetchAssets(entityIdValue);
    setNoChartData(false);
    if (entityIdValue && attributeId && attributeId.length > 0) {
      const obj = await fetchData(entityIdValue, selectedInterval, startTime, endTime);

      // check if there is data or not 
      if (obj && obj.labels.length > 0) {
        await setGraphData(obj);
      } else {
        setNoChartData(true);
      }
    } else {
      setNoChartData(true);
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
          if (key.includes("power_consumption")) {
            attributeId = 'eq.' + key;
          }
        });
        return attributeId;
      }

    } catch (error) {
      console.error("Error fetching asset data:", error);
    }
  };

  const onButtonSelect = () => {
    if (selectedInterval == 'days') {
      let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
      let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
      fetchDataAndAssign(startTime, endTime);
    } else if (selectedInterval == 'weeks') {
      if (selectedWeekSubInterval == 'months') {
        let startTime = moment(startMonth).startOf('month').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(startMonth).endOf('month').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
      } else if (selectedWeekSubInterval == 'all') {
        let startTime = moment(startYear).startOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(startYear).endOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
      } else {
        let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
      }
    } else {
      if (selectedMonthSubInterval == 'all') {
        let startTime = moment(startYear).startOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(startYear).endOf('year').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
      } else {
        let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
        fetchDataAndAssign(startTime, endTime);
      }
    }
  }

  //Set to default value when interval changes 
  useEffect(() => {
    setStartDate(moment().subtract(5, 'days').toDate());
    setEndDate(moment().toDate());
    setStartMonth(moment().startOf('month').toDate());
    setStartYear(moment().startOf('year').toDate());
  }, [selectedInterval]);

  useEffect(() => {
    let startTime = moment(startDate).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
    let endTime = moment(endDate).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss');
    fetchDataAndAssign(startTime, endTime);
  }, [entityIdValue])

  useEffect(() => {
    const containerBody = document.querySelector('.containerBody') as HTMLElement;
    if (containerBody && chartData && chartData.labels.length > 7) {
      const newWidth = 1000 + ((chartData.labels.length - 7) * 100);
      containerBody.style.width = `${newWidth}px`;
    }
  }, [chartData]);

  return (
    <div className="data_viewer_card">
      <Toast ref={toast} />
      <h3 className='dashboard_card_title'>
        {t("dashboard:co2_chart_title")}
      </h3>
      <div className="interval-filter-container">
        <p style={{ fontSize: "19px" }}>{t("dashboard:filterInterval")}</p>
      </div>
      <div className="flex align-items-end gap-2 p-0">
        <div
          className="flex flex-column align-items-start"
          style={{
            margin: '0px',
            maxWidth: '150px',
          }}
        >
          <p style={{marginBottom: '6px'}}>{t("dashboard:type")}</p>
          <div
            className="global-button dropdown dashboard-dropdown w-full"
          >
            <Dropdown
              value={selectedInterval}
              options={intervalButtons.map(({ label, interval }) => ({
                label,
                value: interval,
              }))}
              onChange={(e) => setSelectedInterval(e.value)}
              placeholder={t("dashboard:select_interval")}
              appendTo="self"
              panelClassName='global_dropdown_panel'
            />
            <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
          </div>
        </div>
        {selectedInterval == "days" ? (
          <div className='flex align-items-end gap-2 w-full'>
            <div
              className="start-time-calendar"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                width: '100%'
              }}
            >
              <p style={{marginBottom: '6px'}}>{t("dashboard:startTime")}</p>
              <Calendar
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.value ? moment(e.value).toDate() : null)
                }
                minDate={
                  minimumDate ? moment(minimumDate).toDate() : undefined
                }
                maxDate={moment().toDate()}
                appendTo="self"
                className='w-full'
              />
            </div>

            <div
              className="end-time-calendar w-full"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <p style={{marginBottom: '6px'}}>{t("dashboard:endTime")}</p>
              <Calendar
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.value ? moment(e.value).toDate() : null)
                }
                minDate={moment(startDate).toDate()}
                maxDate={moment().toDate()}
                appendTo="self"
                className='w-full'
              />
            </div>
          </div>
        ) : selectedInterval == "weeks" ? (
          <>
            <div
              className="flex flex-column align-items-start"
            >
              <p style={{marginBottom: '6px'}}>{t("dashboard:interval")}</p>
              <div
                className="global-button dropdown dashboard-dropdown w-full"
              >
                <Dropdown
                  value={selectedWeekSubInterval}
                  options={weekSubIntervalButtons.map(
                    ({ label, interval }) => ({
                      label,
                      value: interval,
                    })
                  )}
                  onChange={(e) => setSelectedWeekSubInterval(e.value)}
                  placeholder={t("dashboard:select_sub_interval")}
                  appendTo="self"
                  panelClassName='global_dropdown_panel'
                />
                <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
              </div>
            </div>
            {selectedWeekSubInterval == "months" ? (
              <div
                className="start-time-calendar"
                style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                }}
              >
                <p style={{marginBottom: '6px'}}>{t("dashboard:months")}</p>
                <Calendar
                  value={startMonth}
                  onChange={(e) =>
                    setStartMonth(e.value ? moment(e.value).toDate() : null)
                  }
                  view="month"
                  dateFormat="mm/yy"
                  minDate={
                    minimumDate
                      ? moment(minimumDate).startOf("month").toDate()
                      : undefined
                  }
                  maxDate={moment().startOf("month").toDate()}
                  appendTo="self"
                  className='w-full'
                />
              </div>
            ) : selectedWeekSubInterval == "all" ? (
              <div
                className="start-time-calendar"
                style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                }}
              >
                <p style={{marginBottom: '6px'}}>{t("dashboard:years")}</p>
                <Calendar
                  value={startYear}
                  onChange={(e) =>
                    setStartYear(e.value ? moment(e.value).toDate() : null)
                  }
                  view="year"
                  dateFormat="yy"
                  appendTo="self"
                  className='w-full'
                />
              </div>
            ) : (
              <>
                <div
                  className="start-time-calendar"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <p style={{marginBottom: '6px'}}>{t("dashboard:startTime")}</p>
                  <Calendar
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.value ? moment(e.value).toDate() : null)
                    }
                    minDate={
                      minimumDate ? moment(minimumDate).toDate() : undefined
                    }
                    maxDate={moment().toDate()}
                    appendTo="self"
                    className='w-full'
                  />
                </div>

                <div
                  className="end-time-calendar"
                  style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                  }}
                >
                  <p style={{marginBottom: '6px'}}>{t("dashboard:endTime")}</p>
                  <Calendar
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.value ? moment(e.value).toDate() : null)
                    }
                    minDate={moment(startDate).toDate()}
                    maxDate={moment().toDate()}
                    appendTo="self"
                    className='w-full'
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-column align-items-start">
              <p style={{marginBottom: '6px'}}>{t("dashboard:interval")}</p>
                  <div className="global-button dropdown dashboard-dropdown w-full">
                  <Dropdown
                    value={selectedMonthSubInterval}
                    options={monthSubIntervalButtons.map(
                      ({ label, interval }) => ({
                        label,
                        value: interval,
                      })
                    )}
                    onChange={(e) => setSelectedMonthSubInterval(e.value)}
                    placeholder={t("dashboard:select_sub_interval")}
                    appendTo="self"
                    panelClassName='global_dropdown_panel'
                  />
                  <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
                </div>
            </div>

            {selectedMonthSubInterval == "all" ? (
              <div
                className="start-time-calendar"
                style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                }}
              >
                <p style={{marginBottom: '6px'}}>{t("dashboard:years")}</p>
                <Calendar
                  value={startYear}
                  onChange={(e) =>
                    setStartYear(e.value ? moment(e.value).toDate() : null)
                  }
                  view="year"
                  dateFormat="yy"
                  className='w-full'
                />
              </div>
            ) : (
              <>
                <div
                  className="start-time-calendar"
                  style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                  }}
                >
                  <p style={{marginBottom: '6px'}}>{t("dashboard:startTime")}</p>
                  <Calendar
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.value ? moment(e.value).toDate() : null)
                    }
                    minDate={
                      minimumDate ? moment(minimumDate).toDate() : undefined
                    }
                    maxDate={moment().toDate()}
                    className='w-full'
                  />
                </div>

                <div
                  className="end-time-calendar"
                  style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                  }}
                >
                  <p style={{marginBottom: '6px'}}>{t("dashboard:endTime")}</p>
                  <Calendar
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.value ? moment(e.value).toDate() : null)
                    }
                    minDate={moment(startDate).toDate()}
                    maxDate={moment().toDate()}
                    className='w-full'
                  />
                </div>
              </>
            )}
          </>
        )}
        <Button
          label={t("button:submit")}
          severity="info"
          onClick={onButtonSelect}
          className='global-button'
          style={{ minWidth: '75px', minHeight: '35px' }}
        />
      </div>
      {noChartData ? (
        <div
          className="flex flex-column justify-content-center align-items-center"
          style={{ marginTop: "5rem" }}
        >
          <p>{t("dashboard:nochartData")}</p>
          <img src="/no-chart-data.png" alt="" width="5%" height="5%" />
        </div>
      ) : isLoading ? (
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
        <div
          style={{
            overflowX: "scroll",
            overflowY: "hidden",
            maxWidth: "100%",
            width: "100%",
          }}
        >
          <div className="containerBody">
            <Chart
              type="bar"
              data={chartData as PowerConsumptionData}
              options={chartOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerCo2Chart;