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

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Chart } from "primereact/chart";
import axios from "axios";
import { Asset } from "@/types/asset-types";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import socketIOClient, { Socket } from "socket.io-client";
import { useRouter } from "next/router";
import "../../styles/combine-chart.css";
import "../../styles/factory-form.css";
import { useDashboard } from "@/context/dashboard-context";
import ChartJS from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { format } from "date-fns";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { InputText } from "primereact/inputtext";
import { useTranslation } from "next-i18next";
import { OverlayPanel } from "primereact/overlaypanel";
import Image from "next/image";


// Register the zoom plugin
ChartJS.register(zoomPlugin);

interface DataItem {
  observedAt: string;
  attributeId: string;
  value: string;
}

interface DataItem {
  observedAt: string;
  attributeId: string;
  value: string;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const SOCKET_API_URL = process.env.NEXT_PUBLIC_BACKEND_SOCKET_URL;

type AttributeOption = {
  selectedDatasetIndex: number;
  label: string;
  value: string;
};

interface ChartDataState extends ChartData<"line", (number | null)[], string> {
  datasets: ChartDataSets[];
}

interface ChartDataSets {
  label: string;
  data: (number | null)[];
  fill: boolean;
  borderColor: string;
  backgroundColor: string;
  tension: number;
}

interface FetchDataParams {
  intervalType: string;
  order: string;
  entityId: string;
  attributeId: string;
  observedAt?: string;
}

interface CustomChangeEvent {
  originalEvent: React.SyntheticEvent;
  value: string | Date;
  target: {
    name: string | null;
    id: string | null;
    value: string | Date;
  };
}
const CombineSensorChart: React.FC = () => {
  const [data, setChartData] = useState<ChartDataState>({
    labels: [],
    datasets: [],
  });
  const { t } = useTranslation(["button", "placeholder", "dashboard"]);
  const socketRef = useRef<Socket | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string>("live"); // Default selected interval
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const [noChartData, setNoChartData] = useState(false)
  const entityIdValue = useSelector((state: RootState) => state.entityId.id);
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState("");
  const [productName, setProductName] = useState<string>("");
  const chartRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState({ min: null, max: null });
  const [zoomState, setZoomState] = useState({
    x: { min: undefined, max: undefined },
    y: { min: undefined, max: undefined },
  });
  const [selectedAttributeId, setSelectedAttributeId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [minDate, setMinDate] = useState<Date | undefined>(undefined);
  const [chartInstance, setChartInstance] = useState(null);
  const { selectedAssetData } = useDashboard();
  const op = useRef<OverlayPanel>(null);
  const intervalButtons = [
    { label: "Live", interval: "live" },
    { label: "10 Min", interval: "10min" },
    { label: "30 Min", interval: "30min" },
    { label: "1 Hour", interval: "60min" },
    { label: "3 Hour", interval: "3hour" },
    { label: "Custom", interval: "custom" },
  ];
  const colors = [
    {
      backgroundColor: "rgba(54, 162, 235, 0.5)", // Blue
      borderColor: "rgb(54, 162, 235)",
    },
    {
      backgroundColor: "rgba(255, 99, 132, 0.5)", // Pink
      borderColor: "rgb(255, 99, 132)",
    },

    {
      backgroundColor: "rgba(255, 206, 86, 0.5)", // Yellow
      borderColor: "rgb(255, 206, 86)",
    },
    {
      backgroundColor: "rgba(75, 192, 192, 0.5)", // Green
      borderColor: "rgb(75, 192, 192)",
    },
    {
      backgroundColor: "rgba(153, 102, 255, 0.5)", // Purple
      borderColor: "rgb(153, 102, 255)",
    },
  ];

  const chartOptions: ChartOptions<"line"> = {
    animation: {
      duration: 0,
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      decimation:
        selectedInterval === "custom"
          ? {
            enabled: true,
            algorithm: "lttb",
            samples: 300, // Set decimation to 300
          }
          : undefined,
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context: TooltipItem<"line">) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
          title: function (context: TooltipItem<"line">[]) {
            return format(new Date(context[0].parsed.x), "PPpp");
          },
        },
      },
      datalabels: {
        display: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "xy",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "xy",
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "PPpp",
          displayFormats: {
            millisecond: "MMM dd, yyyy HH:mm:ss",
            second: "MMM dd, yyyy HH:mm:ss",
            minute: "MMM dd, yyyy HH:mm",
            hour: "MMM dd, yyyy HH:mm",
            day: "MMM dd, yyyy",
            week: "MMM dd, yyyy",
            month: "MMM yyyy",
            quarter: "QQQ yyyy",
            year: "yyyy",
          },
        },
        ticks: {
          source: "auto",
          maxTicksLimit: 20,
          major: {
            enabled: true,
          },
          callback: function (val: number | string, index: number) {
            const labelDate = new Date(val);
            return format(labelDate, "MMM dd, yyyy HH:mm");
          },
        },
        title: {
          display: true,
          text: "",
        },
      },
      y: {
        type: "linear",
        beginAtZero: true,
        title: {
          display: true,
          text: "Value",
        },
      },
    },
  };

  const formatAttributeName = (attributeName: string) => {
    // Convert attribute name to camel case
    const camelCaseName = attributeName.replace(
      /-([a-z])/g,
      (match, letter) => ` ${letter.toUpperCase()}`
    );
    // Capitalize the first letter
    return camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  };
  function formatLabel(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`;
  }

  type AttributeOption = {
    label: string;
    value: string;
    selectedDatasetIndex: number;
  };

  const fetchAsset = async () => {
    try {
      const productKey = Object.keys(selectedAssetData).find(key => key.includes("product_name"));
      const creationKey = Object.keys(selectedAssetData).find(key => key.includes("creation_date"));
      const creationDate = creationKey ? selectedAssetData[creationKey]?.value : undefined;
      if (creationDate) {
        const [month, day, year] = creationDate.split('.');
        setMinDate(new Date(year, month - 1, day));
      }
      const productName = productKey ? (selectedAssetData[productKey]?.value || "Unknown Product") : undefined;
      setProductName(productName); // Set the product name in the state

      // fetch templates from template sandbox
      const temp = await axios.get(API_URL + `/mongodb-templates/type/${btoa(selectedAssetData.type)}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      // Collect keys where the segment is 'realtime'and remove eclass in the key if present
      const prefixedKeys = Object.keys(temp.data.properties)
        .filter((key: string) => temp.data.properties[key].segment === 'realtime')
        .map((key: string) => key.includes("eclass:") ? key.split("eclass:").pop() || key : key);

      // const attributeLabels: AttributeOption[] = prefixedKeys.map(key => {
      //   let index = 0;
      //   const label = key.split("/").pop() || key;
      //   return { label, value: label, selectedDatasetIndex: index + 1 };
      // })
      //   .filter(attribute => attribute.value !== "machine_state");
      const storedValues: Record<string, number> = {}; // keeps state across calls

      const attributeLabels: AttributeOption[] = Object.entries(selectedAssetData)
        .filter(([key, value]) => {
          const isNumeric = !isNaN(Number(value));
          const label = key.split("/").pop() || key;

          if (!isNumeric || label === "machine_state") return false;

          const numericValue = Number(value);
          const hasChanged = storedValues[key] !== numericValue;

          // Store or update the value
          storedValues[key] = numericValue;

          return hasChanged || !(key in storedValues); // first time or changed
        })
        .map(([key, _value], index) => {
          const label = key.split("/").pop() || key;
          return {
            label,
            value: label,
            selectedDatasetIndex: index + 1,
          };
        });

      console.log("Labels", attributeLabels);

      setAttributes(attributeLabels);
      const existingAttribute = attributeLabels.find(attr => attr.value == selectedAttribute);

      if (selectedAttribute == '' || selectedAttribute == undefined || selectedAttribute == null) {
        setSelectedAttribute(attributeLabels[0].value);
      }
    }
    catch (error) {
      setAttributes([]);
      setSelectedAttribute(""); // Reset if an error occurs or no attributes are available
    }
  };

  const handleAttributeChange = (selectedValue: string) => {
    setSelectedAttribute(selectedValue); // Set the attribute then fetch
  };

  const handleIntervalChange = (e: CustomChangeEvent) => {
    const newInterval = e.target.value;
    if (typeof newInterval === "string") {
      setSelectedInterval(newInterval);
    }
    setChartData({
      labels: [],
      datasets: [],
    });

  };
  const fetchDataForAttribute = async (attributeId: string, entityIdValue: string, selectedInterval: string, selectedDate?: Date, startTime?: Date, endTime?: Date) => {
    setChartData({
      labels: [],
      datasets: []
    });
    setLoading(true); // Start loading
    if (!entityIdValue) {
      return;
    }

    let attributeKey = selectedAssetData
      ? Object.keys(selectedAssetData).find(key => String(key) === String(attributeId))
      : undefined;

    const params: FetchDataParams = {
      intervalType: selectedInterval,
      order: "observedAt.desc",
      entityId: `eq.${entityIdValue}`,
      attributeId: `eq.${attributeKey}`,
    };

    // Customize parameters for custom intervals
    if (selectedInterval == 'custom' && selectedDate && startTime && endTime) {

      const startDate = new Date(selectedDate);
      startDate.setHours(startTime.getHours(), startTime.getMinutes());
      const endDate = new Date(selectedDate);
      endDate.setHours(endTime.getHours(), endTime.getMinutes());
      params.observedAt = `gte.${startDate.toISOString()}&observedAt=lt.${endDate.toISOString()}`;
    }

    try {
      const response = await axios.get(`${API_URL}/pgrest`, {
        params,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      const factoryData = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      const labels = factoryData.map((data: DataItem) => formatLabel(new Date(data.observedAt)));
      const dataPoints = factoryData.map((data: DataItem) => data.value ? Number(data.value) : null);

      const newDataset = {
        label: attributeId.replace('eq.', ''),
        data: dataPoints,
        fill: true,
        borderColor: colors[0 % colors.length].borderColor,
        backgroundColor: 'rgba(122, 162, 227, 0.2)',
        tension: 0.4,
      };

      if (selectedInterval != "custom") {
        setChartData(prevData => ({
          ...prevData,
          labels,
          datasets: [...prevData.datasets, newDataset]
        }));

      } else {
        setChartData({
          labels,
          datasets: [newDataset],
        });
      }
      setSelectedAttributeId(`eq.${attributeId}`);
      setLoading(false);
      setNoChartData(false);
    } catch (error) {
      console.error("Error fetching data for attribute:", error);
      setNoChartData(true);
    }
  }

  const handleDateChange = async (e: CustomChangeEvent) => {
    setSelectedDate(e.value as Date);
  };

  const handleTimeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    const timeValue = e.target.value;
    const [hours, minutes] = timeValue.split(":").map(Number);
    const datePart = selectedDate
      ? new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
      : new Date();
    const newTime = new Date(datePart.setHours(hours, minutes, 0, 0));
    const currentDate = new Date();

    if (type === "start") {
      if (!endTime || newTime < endTime) {
        setStartTime(newTime);
      } else {
        // If new start time is not earlier than end time, reset it
        e.target.value = startTime ? format(startTime, "HH:mm") : "";
      }
    } else if (type === "end") {
      // Ensure end time is not in the future
      if (
        selectedDate &&
        datePart.toDateString() === currentDate.toDateString() &&
        newTime > currentDate
      ) {
        alert("End time cannot exceed the current time.");
        e.target.value = endTime
          ? format(endTime, "HH:mm")
          : format(new Date(), "HH:mm");
      } else if (!startTime || newTime > startTime) {
        setEndTime(newTime);
      } else {
        // If new end time is not later than start time, reset it
        e.target.value = endTime ? format(endTime, "HH:mm") : "";
      }
    }
  };

  function updateChartDataWithSocketData(
    currentChartData: ChartDataState,
    newData: DataItem[]
  ) {
    let dataChanged = false; // A flag to detect if data actually changed
    const newChartData = {
      ...currentChartData,
      labels: currentChartData.labels ? [...currentChartData.labels] : [], // Ensure labels is an array
      datasets: currentChartData.datasets.map((ds) => ({ ...ds })), // Clone datasets for immutability
    };

    newData.forEach((dataItem) => {
      const { observedAt, attributeId, value } = dataItem;

      // Clean the attributeId by removing the URL prefix
      const cleanAttributeId = attributeId.split('/').pop();

      // Skip updates for the machine_state attribute
      if (cleanAttributeId === 'machine_state') {
        return;
      }

      // Attempt to find the dataset with the cleaned attributeId
      const datasetIndex = newChartData.datasets.findIndex(
        (ds) => ds.label === cleanAttributeId
      );
      if (datasetIndex === -1) {
        return; // If no dataset matches, skip this data item
      }

      // Parse the value as a float
      const numericValue = parseFloat(value);
      // Format the observedAt date for the label
      const label = formatLabel(new Date(observedAt));

      // Find the index of the label in the chart data
      const labelIndex = newChartData.labels.indexOf(label);
      if (labelIndex === -1) {
        // If label is not found, append it and add the value to the correct dataset
        newChartData.labels.push(label);
        newChartData.datasets.forEach((ds, index) => {
          ds.data.push(index === datasetIndex ? numericValue : null); // Append null to other datasets to maintain alignment
        });
        dataChanged = true; // Mark that data has changed
      } else {
        // If label is found, update the existing value at the correct index
        newChartData.datasets[datasetIndex].data[labelIndex] = numericValue;
        dataChanged = true; // Mark that data has changed
      }
    });

    if (dataChanged) {
      // If data has changed, re-sort the data based on labels to maintain chronological order
      const sortedIndices = newChartData.labels
        .map((label, index) => ({ label, index }))
        .sort(
          (a, b) => new Date(a.label).getTime() - new Date(b.label).getTime()
        )
        .map((data) => data.index);

      newChartData.labels = sortedIndices.map(
        (index) => newChartData.labels[index]
      ); // Sort labels
      newChartData.datasets.forEach((ds) => {
        ds.data = sortedIndices.map((index) => ds.data[index]); // Sort each dataset's data array
      });

      return newChartData; // Return the updated chart data
    } else {
      return currentChartData; // Return the original chart data if no changes were made
    }
  }

  useEffect(() => {
    // Reset attributes when entityIdValue changes
    setAttributes([]);
    setSelectedAttribute("");
  }, [entityIdValue]);

  const fetchData = async () => {
    await fetchAsset();
    await fetchDataForAttribute(selectedAttribute, entityIdValue, selectedInterval, selectedDate, startTime, endTime);
  }

  useEffect(() => {
    if (selectedInterval === 'custom' && (!selectedDate || !startTime || !endTime)) {
      return;
    }
    if (selectedAssetData.id) {
      fetchData();
    }

  }, [selectedAssetData, selectedAttribute, entityIdValue, selectedInterval, router.isReady, zoomLevel]);


  useEffect(() => {

    const socket = socketIOClient(`${SOCKET_API_URL}/`, {
      transports: ["websocket"],
      rejectUnauthorized: false, // Ignore SSL certificate validation (only for HTTPS)
      reconnectionAttempts: 5, // Retry if connection fails
      timeout: 5000, // Set connection timeout
      secure: true
    }
    );
    socketRef.current = socket;

    socketRef.current.on("dataUpdate", (updatedData: []) => {
      setChartData(currentData => updateChartDataWithSocketData(currentData, updatedData));

    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [data]);

  const chartOptionsWithZoomPan = {
    ...chartOptions,
    scales: {
      x: {
        ...chartOptions.scales?.x,
        min: zoomState.x.min,
        max: zoomState.x.max,
      },
      y: {
        ...chartOptions.scales?.y,
        min: zoomState.y.min,
        max: zoomState.y.max,
      },
    },
  };
  const handleLoad = async () => {
    op.current?.hide();
    await fetchDataForAttribute(
      selectedAttribute,
      entityIdValue,
      selectedInterval,
      selectedDate,
      startTime,
      endTime
    );
  };
  const startTimeValue = startTime ? format(startTime, "HH:mm") : "";
  const endTimeValue = endTime ? format(endTime, "HH:mm") : "";

  const formatDateWithTimeRange = (
    date: Date | null,
    startTime: Date | undefined,
    endTime: Date | undefined
  ): string => {
    if (!date || !startTime || !endTime) return '--';

    const formatTime = (time: Date): string => {
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    const formattedStart = formatTime(startTime);
    const formattedEnd = formatTime(endTime);

    return `${day}/${month}/${year} (${formattedStart} - ${formattedEnd})`;
  };


  return (
    <div className="data_viewer_card">
      {/* <div className="custom-button-container">
        <div className="custom-button">
          <span className="button-text">
            {formatAttributeName(selectedAttribute) ||
              t("dashboard:selectAnAttribute")}
          </span>
        </div>
      </div> */}
      <div className="grid p-fluid">
        <div className="col-12">
          <div className="control-container">
            <div className="control_form_field">
              <label htmlFor="attribute" className="dashboard_control_label">{t("dashboard:selectAttribute")}</label>
              <div className="global-button dropdown dashboard-dropdown">
                <Dropdown
                  id="attribute"
                  inputId="attribute"
                  name="attribute"
                  value={selectedAttribute || t("dashboard:selectAnAttribute")}
                  options={attributes}
                  onChange={(e) => handleAttributeChange(e.value)}
                  placeholder={t("placeholder:selectAttribute")}
                  style={{ width: "100%" }}
                  appendTo="self"
                  panelClassName="global_dropdown_panel"
                />
                <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
              </div>
            </div>
            <div className="control_form_field">
              <label htmlFor="intervall" className="dashboard_control_label">{t("dashboard:interval")}</label>
              <div className="global-button dropdown dashboard-dropdown">
                <Dropdown
                  inputId="intervall"
                  value={selectedInterval}
                  options={intervalButtons.map(({ label, interval }) => ({
                    label,
                    value: interval,
                  }))}
                  onChange={(e) => handleIntervalChange(e as CustomChangeEvent)}
                  placeholder="Select an Interval"
                  appendTo="self"
                  panelClassName="global_dropdown_panel"

                />
                <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
              </div>
            </div>
            {selectedInterval === 'custom' && (
              <div className="control_form_field">
                <label htmlFor="" className="dashboard_control_label">Pick Timeframe</label>
                <Button className="timeframe_op_trigger" onClick={(e) => op.current?.toggle(e)}>
                  <Image src="/dashboard-collapse/calendar_icon.svg" width={16} height={16} alt=""></Image>
                  <div>{selectedDate ? formatDateWithTimeRange(selectedDate, startTime, endTime) : 'Pick a date'}</div>
                  <Image src="/dropdown-icon.svg" width={8} height={14} alt=""></Image>
                </Button>
              </div>)
            }

            <OverlayPanel ref={op} className="timeframe_overlaypanel">
              <div className="timetrame_form">
                <div className="control_form_field">
                  <label htmlFor="date_inputt" className="dashboard_control_label">{t("dashboard:selectDate")}</label>
                  <Calendar
                    inputId="date_inputt"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e as CustomChangeEvent)}
                    showTime={false}
                    dateFormat="yy-mm-dd"
                    placeholder={t("placeholder:selectDate")}
                    className="w-full sm:w-auto"
                    minDate={minDate}
                    maxDate={new Date()}
                    disabled={selectedInterval !== "custom"}
                    appendTo="self"

                  />
                </div>
                <div className="control_form_field">
                  <label htmlFor="startTime" className="dashboard_control_label">{t("dashboard:startTime")}</label>
                  <InputText
                    id="startTime"
                    type="time"
                    value={startTime ? format(startTime, "HH:mm") : ""}
                    onChange={(e) => handleTimeInputChange(e, "start")}
                    placeholder="Start Time"
                    className="w-full"
                    disabled={selectedInterval !== "custom"}
                  />
                </div>
                <div className="control_form_field">
                  <label htmlFor="endTime" className="dashboard_control_label">{t("dashboard:endTime")}</label>
                  <InputText
                    id="endTime"
                    type="time"
                    value={endTime ? format(endTime, "HH:mm") : ""}
                    onChange={(e) => handleTimeInputChange(e, "end")}
                    placeholder="End Time"
                    className="w-full "
                    disabled={selectedInterval !== "custom"}
                  />
                </div>
              </div>
              <Button
                label={t("button:load")}
                severity="info"
                disabled={selectedInterval !== "custom"}
                style={{ width: "100px" }}
                className="global-button"
                onClick={handleLoad} // Call the handleLoad function when the button is clicked
              />
            </OverlayPanel>
          </div>
          <div>
            {!entityIdValue ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "60vh",
                }}
              >
                <p>
                  <b>No Asset Selected !! Please Select an asset ...</b>
                </p>
                <img src="/no-chart-data.png" alt="" width="5%" height="15%" />
              </div>
            ) : loading ? (
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
            ) : data.datasets && data.datasets.length > 0 && !noChartData ? (
              <Chart
                key={JSON.stringify(data)}
                type="line"
                data={{
                  ...data,
                  datasets: data.datasets.filter(
                    (dataset) => dataset.label === selectedAttribute
                  ),
                }}
                options={chartOptionsWithZoomPan}
                style={{ height: "60vh" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "60vh",
                }}
              >
                <p>No chart data available</p>
                <img src="/no-chart-data.png" alt="" width="5%" height="15%" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombineSensorChart;
