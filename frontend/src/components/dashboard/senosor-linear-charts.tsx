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

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { getAssetById } from "@/utility/factory-site-utility";

// ─── Inline Chart.js Plugins ────────────────────────────────────────────────

/** Draws a vertical crosshair line and timestamp label at the cursor position. */
const crosshairPlugin = {
  id: "crosshair",
  _x: null as number | null,
  afterDraw(chart: any) {
    const x = (this as any)._x;
    if (x === null) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    if (x < chartArea.left || x > chartArea.right) return;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100,100,100,0.5)";
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    const xVal = scales.x?.getValueForPixel(x);
    if (xVal !== undefined) {
      const label = format(new Date(xVal), "HH:mm:ss");
      ctx.fillStyle = "rgba(60,60,60,0.85)";
      ctx.font = "11px sans-serif";
      const tw = ctx.measureText(label).width;
      const lx = Math.min(x + 6, chartArea.right - tw - 4);
      ctx.fillRect(lx - 2, chartArea.bottom + 2, tw + 4, 16);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, lx, chartArea.bottom + 14);
    }
    ctx.restore();
  },
};

/** Draws coloured vertical band backgrounds for machine state periods. */
const machineStateBandsPlugin = {
  id: "machineStateBands",
  beforeDatasetsDraw(chart: any) {
    const bands: Array<{ from: number; to: number; state: string }> =
      chart.options?.plugins?.machineStateBands?.bands ?? [];
    if (!bands.length) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    const colorMap: Record<string, string> = {
      "Online Running": "rgba(56, 189, 103, 0.10)",
      "Online Idle": "rgba(250, 173, 20, 0.12)",
      Offline: "rgba(130, 130, 130, 0.10)",
    };
    ctx.save();
    bands.forEach(({ from, to, state }) => {
      const x1 = scales.x?.getPixelForValue(from);
      const x2 = scales.x?.getPixelForValue(to);
      if (x1 === undefined || x2 === undefined) return;
      const left = Math.max(chartArea.left, Math.min(x1, x2));
      const right = Math.min(chartArea.right, Math.max(x1, x2));
      if (right <= left) return;
      ctx.fillStyle = colorMap[state] ?? "rgba(180,180,180,0.08)";
      ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
    });
    ctx.restore();
  },
};

// Register plugins
ChartJS.register(zoomPlugin, crosshairPlugin, machineStateBandsPlugin);

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
// ─── KPI helpers ────────────────────────────────────────────────────────────

function computeKPIs(
  values: (number | null)[],
  labels: string[],
  globalAvg?: number,
  globalStdDev?: number
) {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (!valid.length) return null;
  const last = valid[valid.length - 1];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
  const variance = valid.reduce((s, v) => s + (v - avg) ** 2, 0) / valid.length;
  const stdDev = Math.sqrt(variance);
  const half = Math.floor(valid.length / 2);
  const firstHalfAvg = half > 0 ? valid.slice(0, half).reduce((s, v) => s + v, 0) / half : avg;
  const secondHalfAvg = half > 0 ? valid.slice(half).reduce((s, v) => s + v, 0) / (valid.length - half) : avg;
  const trend: "up" | "down" | "stable" =
    secondHalfAvg > firstHalfAvg * 1.005 ? "up" : secondHalfAvg < firstHalfAvg * 0.995 ? "down" : "stable";
  // Use global baseline when provided so anomaly count stays consistent
  // with the red dots even when zoomed into a narrow window
  const baseAvg = globalAvg ?? avg;
  const baseStdDev = globalStdDev ?? stdDev;
  const anomalyCount = valid.filter((v) => Math.abs(v - baseAvg) > 2 * baseStdDev).length;
  return { last, min, max, avg, stdDev, trend, anomalyCount };
}

function computeAnomalyColors(
  values: (number | null)[],
  avg: number,
  stdDev: number
): { pointBg: string[]; pointRadius: number[] } {
  const pointBg: string[] = [];
  const pointRadius: number[] = [];
  values.forEach((v) => {
    if (v !== null && Math.abs(v - avg) > 2 * stdDev) {
      pointBg.push("rgba(239, 68, 68, 0.9)");
      pointRadius.push(6);
    } else {
      pointBg.push("rgba(54, 162, 235, 0.8)");
      pointRadius.push(2);
    }
  });
  return { pointBg, pointRadius };
}

interface KPIStats {
  last: number;
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  trend: "up" | "down" | "stable";
  anomalyCount: number;
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
  const { selectedAssetData, machineStateData } = useDashboard();
  const op = useRef<OverlayPanel>(null);
  const thresholdOp = useRef<OverlayPanel>(null);

  // ── New state: KPI, threshold, freshness, zoom tracking ──────────────────
  const [kpiStats, setKpiStats] = useState<KPIStats | null>(null);
  const [hasZoomed, setHasZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [thresholdsByAttr, setThresholdsByAttr] = useState<Record<string, {
    upperWarning: string; lowerWarning: string; upperAlarm: string; lowerAlarm: string;
  }>>({});
  const currentThresh = thresholdsByAttr[selectedAttribute] ?? {
    upperWarning: "", lowerWarning: "", upperAlarm: "", lowerAlarm: "",
  };
  const upperWarning = currentThresh.upperWarning;
  const lowerWarning = currentThresh.lowerWarning;
  const upperAlarm = currentThresh.upperAlarm;
  const lowerAlarm = currentThresh.lowerAlarm;
  const updateThreshold = (field: "upperWarning" | "lowerWarning" | "upperAlarm" | "lowerAlarm", v: string) => {
    if (v !== "" && !/^-?\d*\.?\d*$/.test(v)) return;
    setThresholdsByAttr(prev => ({
      ...prev,
      [selectedAttribute]: {
        ...(prev[selectedAttribute] ?? { upperWarning: "", lowerWarning: "", upperAlarm: "", lowerAlarm: "" }),
        [field]: v,
      },
    }));
  };
  const resetThresholds = () => setThresholdsByAttr(prev => ({
    ...prev,
    [selectedAttribute]: { upperWarning: "", lowerWarning: "", upperAlarm: "", lowerAlarm: "" },
  }));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Incrementing this key forces the <Chart> to fully remount, resetting zoom to full data range
  // resetKey removed — chart.resetZoom() is used instead (kept as no-op reference guard)
  const intervalButtons = [
    { label: t("dashboard:live"), interval: "live" },
    { label: `10 ${t("dashboard:min")}`, interval: "10min" },
    { label: `30 ${t("dashboard:min")}`, interval: "30min" },
    { label: `1 ${t("dashboard:hour")}`, interval: "60min" },
    { label: `3 ${t("dashboard:hour")}`, interval: "3hour" },
    { label: t("dashboard:custom"), interval: "custom" },
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

  // ── Derive machine state bands from machineStateData ─────────────────────
  const machineStateBands: Array<{ from: number; to: number; state: string }> =
    React.useMemo(() => {
      if (!machineStateData) return [];
      const bands: Array<{ from: number; to: number; state: string }> = [];
      Object.entries(machineStateData).forEach(([state, entries]: [string, any]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach((entry: any) => {
          const from = entry?.from ? new Date(entry.from).getTime() : null;
          const to = entry?.to ? new Date(entry.to).getTime() : Date.now();
          if (from) bands.push({ from, to, state });
        });
      });
      return bands;
    }, [machineStateData]);

  // ── Freshness timer (updates every second) ───────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdateRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
            const yVal = context.parsed.y;
            const formatted = Number.isInteger(yVal) ? yVal.toString() : parseFloat(yVal.toFixed(4)).toString();
            return `${context.dataset.label}: ${formatted}`;
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
          enabled: false,
          mode: "xy",
        },
        zoom: {
          wheel: {
            enabled: false,
          },
          pinch: {
            enabled: false,
          },
          mode: "xy",
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "PPpp.SSS",
          displayFormats: {
            millisecond: "HH:mm:ss.SSS",
            second: "HH:mm:ss",
            minute: "HH:mm",
            hour: "HH:mm",
            day: "MMM dd",
            week: "MMM dd",
            month: "MMM yyyy",
            quarter: "QQQ yyyy",
            year: "yyyy",
          },
        },
        ticks: {
          source: "auto",
          maxTicksLimit: 8,
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0,
          major: {
            enabled: true,
          },
          font: {
            size: 11,
          },
          callback: function (val: number | string, index: number) {
            const labelDate = new Date(val);
            const now = new Date();
            const diffInHours = (now.getTime() - labelDate.getTime()) / (1000 * 60 * 60);
            
            // Check the zoom level by looking at the range
            const chart = (this as any).chart;
            const range = chart?.scales?.x?.max - chart?.scales?.x?.min;
            
            // If zoomed to less than 1 minute, show milliseconds
            if (range && range < 60000) {
              return format(labelDate, "HH:mm:ss.SSS");
            }
            // If within 24 hours, show time only
            else if (diffInHours < 24) {
              return format(labelDate, "HH:mm:ss");
            }
            // If within 7 days, show day and time
            else if (diffInHours < 168) {
              return format(labelDate, "MMM dd HH:mm");
            }
            // Otherwise show date only
            else {
              return format(labelDate, "MMM dd, yyyy");
            }
          },
        },
        title: {
          display: false,
          text: "",
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1,
        },
      },
      y: {
        type: "linear",
        beginAtZero: true,
        min: 0,
        ticks: {
          precision: 4,
        },
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
      const scorpioData = await getAssetById(selectedAssetData.id);
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

      const prefixedKeys = Object.keys(temp.data.properties)
        .filter((key: string) => temp.data.properties[key].segment !== 'realtime');

      const excluded = new Set(prefixedKeys);

      // helper to normalize keys the same way
      const normalize = (k: string) => (k.includes('eclass:') ? k.split('eclass:').pop() || k : k);

      // 2) Collect allowed labels from selectedAssetData (unique, filtered)
      const attributeLabels: AttributeOption[] = Object.entries(scorpioData)
        .filter(([_, val]) => {
          if (typeof val === "object") {
            // ✅ Find a key ending with 'segment'
            const segmentEntry = Object.entries(val).find(
              ([innerKey]) => innerKey.endsWith("segment")
            );

            // ✅ Find if 'observedAt' exists
            const hasObservedAt = Object.prototype.hasOwnProperty.call(val, "observedAt");

            // Check for realtime segment
            const isRealtimeSegment = (() => {
              if (!segmentEntry) return false;
              const [, segmentValueObj] = segmentEntry;
              const segmentValue = segmentValueObj?.value?.toLowerCase?.();
              return segmentValue === "realtime";
            })();

            // ✅ Keep if either condition is true
            return isRealtimeSegment || hasObservedAt;
          }
          return false;
        })
        .map(([key]) => {
          const lastPart = key.split("/").pop() ?? key;
          const formatted = lastPart
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
          return { label: formatted, value: lastPart, selectedDatasetIndex: 1 };
        });



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

    let attributeKey = attributeId;

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

      // Calculate average for the average line
      const validDataPoints = dataPoints.filter((point): point is number => point !== null);
      const average = validDataPoints.length > 0 
        ? validDataPoints.reduce((sum, val) => sum + val, 0) / validDataPoints.length 
        : 0;

      // Create average line dataset
      const averageDataset = {
        label: 'Average',
        data: labels.map(() => average),
        fill: false,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
      };

      // For live intervals, replace the chart data instead of appending
      setChartData({
        labels,
        datasets: [newDataset, averageDataset],
      });
      
      setSelectedAttributeId(`eq.${attributeId}`);
      setLoading(false);
      setNoChartData(false);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setNoChartData(true);
      setLoading(false);
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

      // Recalculate average for all non-average datasets
      newChartData.datasets.forEach((dataset, idx) => {
        if (dataset.label !== 'Average') {
          const validPoints = dataset.data.filter((point): point is number => point !== null);
          const average = validPoints.length > 0
            ? validPoints.reduce((sum, val) => sum + val, 0) / validPoints.length
            : 0;
          
          // Find and update the average dataset
          const avgDataset = newChartData.datasets.find(ds => ds.label === 'Average');
          if (avgDataset) {
            avgDataset.data = newChartData.labels.map(() => average);
          }
        }
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

  useEffect(() => {
    const fetchData = async () => {
      await fetchAsset();
      await fetchDataForAttribute(selectedAttribute, entityIdValue, selectedInterval, selectedDate, startTime, endTime);
    };

    if (selectedInterval === 'custom' && (!selectedDate || !startTime || !endTime)) {
      return;
    }
    if (selectedAssetData.id) {
      fetchData();
    }

  }, [selectedAssetData, selectedAttribute, entityIdValue, selectedInterval, router.isReady]);

  useEffect(() => {
    console.log("WebSocket: Connecting to", API_URL);

    const socket = socketIOClient(`${API_URL}/`, {
      transports: ["websocket"],
      rejectUnauthorized: false, // Ignore SSL certificate validation (only for HTTPS)
      reconnectionAttempts: 5, // Retry if connection fails
      timeout: 5000, // Set connection timeout
      secure: true
    }
    );
    socketRef.current = socket;

    socketRef.current.on("connect", () => {
      console.log("WebSocket: Connected");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("WebSocket: Connection error", error);
    });

    socketRef.current.on("dataUpdate", (updatedData: []) => {
      console.log("WebSocket: Received update (", updatedData.length, "records)");
      lastUpdateRef.current = Date.now();
      setChartData(currentData => updateChartDataWithSocketData(currentData, updatedData));
    });

    socketRef.current.on("disconnect", () => {
      console.log("WebSocket: Disconnected");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Fixed: empty dependency array to prevent reconnection on every data update

  // Stable ref so memoized options callbacks always call the latest version
  const recalcRef = useRef<(chart: any) => void>(() => {});
  // Set to true during programmatic resetZoom so onZoomComplete skips setHasZoomed(true)
  const isResettingRef = useRef(false);
  // Full-dataset avg/stdDev — the single source of truth for anomaly thresholds.
  // Only updated when new raw data arrives, never when zooming, so the baseline
  // never drifts and the spike count always matches the red dots on the chart.
  const globalStatsRef = useRef<{ avg: number; stdDev: number } | null>(null);

  const recalculateVisibleAverage = (chart: any) => {
    try {
      const xScale = chart.scales?.x;
      if (!xScale) return;
      const xMin = xScale.min;
      const xMax = xScale.max;
      const labels: string[] = chart.data?.labels;
      const datasets = chart.data?.datasets;
      if (!labels || !datasets) return;
      const mainDataset = datasets.find((ds: any) => ds.label !== 'Average' && !ds.label?.startsWith('__'));
      const avgDataset = datasets.find((ds: any) => ds.label === 'Average');
      if (!mainDataset || !avgDataset) return;
      const visibleValues = labels
        .map((label: string, idx: number) => ({ time: new Date(label).getTime(), value: mainDataset.data[idx] }))
        .filter((p: any) => p.time >= xMin && p.time <= xMax && p.value !== null && !isNaN(p.value))
        .map((p: any) => p.value as number);
      if (visibleValues.length === 0) return;
      const avg = visibleValues.reduce((sum, v) => sum + v, 0) / visibleValues.length;
      const rounded = parseFloat(avg.toFixed(4));
      avgDataset.data = labels.map(() => rounded);

      // Update KPI stats with visible window
      const visibleLabels = labels.filter((label: string) => {
        const t = new Date(label).getTime();
        return t >= xMin && t <= xMax;
      });
      const visibleData = visibleLabels.map((_: string, i: number) => {
        const globalIdx = labels.indexOf(visibleLabels[i]);
        return mainDataset.data[globalIdx] ?? null;
      });
      const newKpi = computeKPIs(
        visibleData,
        visibleLabels,
        globalStatsRef.current?.avg,
        globalStatsRef.current?.stdDev
      );
      if (newKpi) setTimeout(() => setKpiStats(newKpi), 0);

      requestAnimationFrame(() => {
        if (chart && !chart.destroyed && chart.canvas && chart.canvas.isConnected) {
          chart.update('none');
        }
      });
    } catch (e) {
      // Silently ignore errors during zoom/pan transitions
    }
  };

  // Keep recalcRef current on every render so the memoized callbacks below
  // always call the latest recalculateVisibleAverage without needing it as a dep.
  recalcRef.current = recalculateVisibleAverage;

  // useMemo gives chartOptionsWithZoomPan a STABLE object reference.
  // PrimeReact wraps <Chart> in React.memo and bails out when
  // prevOptions === nextOptions, so unrelated re-renders (e.g. the 1-second
  // freshness timer) no longer destroy + recreate the chart instance,
  // which was resetting zoom state every second.
  const chartOptionsWithZoomPan = useMemo(() => {
    // Strip min / beginAtZero from the y-scale so the zoom plugin owns the bounds
    const { min: _yMin, beginAtZero: _yBZ, ...yScaleRest } =
      (chartOptions.scales?.y ?? {}) as any;
    return {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        zoom: {
          pan: {
            enabled: selectedInterval !== 'live',
            mode: "xy" as const,
            onPanComplete: ({ chart }: any) => {
              setTimeout(() => recalcRef.current(chart), 0);
            },
          },
          zoom: {
            wheel: { enabled: selectedInterval !== 'live' },
            pinch: { enabled: selectedInterval !== 'live' },
            mode: "xy" as const,
            onZoomComplete: ({ chart }: any) => {
              setTimeout(() => {
                if (!isResettingRef.current) setHasZoomed(true);
                isResettingRef.current = false;
                recalcRef.current(chart);
              }, 0);
            },
          },
          limits: {
            x: { minRange: 100 },
            y: { minRange: 0.0001 },
          },
        },
        machineStateBands: { bands: machineStateBands },
        crosshair: {},
      },
      scales: {
        x: { ...chartOptions.scales?.x },
        y: yScaleRest,
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterval, machineStateBands]);

  // ── KPI recompute on fresh data ──────────────────────────────────────────
  useEffect(() => {
    if (!data.datasets?.length || !data.labels?.length) { setKpiStats(null); return; }
    const mainDs = data.datasets.find((ds) => ds.label !== 'Average' && !ds.label?.startsWith('__'));
    if (!mainDs) return;
    const stats = computeKPIs(mainDs.data as (number | null)[], data.labels as string[]);
    // Persist full-data baseline in a ref so zoom operations always compare
    // against it — never against a drifting window-local avg/stdDev.
    if (stats) globalStatsRef.current = { avg: stats.avg, stdDev: stats.stdDev };
    setKpiStats(stats);
    // Also reset zoom tracker when new data arrives
    setHasZoomed(false);
  }, [data]);

  // ── Fullscreen toggle effect ─────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Crosshair canvas mouse tracking ─────────────────────────────────────
  useEffect(() => {
    const chartEl = (chartRef.current as any)?.getChart?.();
    if (!chartEl) return;
    const canvas = chartEl.canvas as HTMLCanvasElement;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      (crosshairPlugin as any)._x = e.clientX - rect.left;
      chartEl.draw();
    };
    const onLeave = () => {
      (crosshairPlugin as any)._x = null;
      chartEl.draw();
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  });

  // ── Build threshold datasets to inject into chart data ──────────────────
  const thresholdDatasets = React.useMemo(() => {
    if (!data.labels?.length) return [];
    const extra: any[] = [];
    const mkLine = (value: number, label: string, color: string, dash: number[]) => ({
      label,
      data: (data.labels as string[]).map(() => value),
      fill: false,
      borderColor: color,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderDash: dash,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
    });
    const uw = parseFloat(upperWarning);
    const lw = parseFloat(lowerWarning);
    const ua = parseFloat(upperAlarm);
    const la = parseFloat(lowerAlarm);
    if (!isNaN(uw)) extra.push(mkLine(uw, "__ Upper Warning", "rgba(250,173,20,0.9)", [6, 3]));
    if (!isNaN(lw)) extra.push(mkLine(lw, "__ Lower Warning", "rgba(250,173,20,0.9)", [6, 3]));
    if (!isNaN(ua)) extra.push(mkLine(ua, "__ Upper Alarm", "rgba(239,68,68,0.9)", [4, 2]));
    if (!isNaN(la)) extra.push(mkLine(la, "__ Lower Alarm", "rgba(239,68,68,0.9)", [4, 2]));
    return extra;
  }, [data.labels, upperWarning, lowerWarning, upperAlarm, lowerAlarm]);

  // ── Anomaly-coloured point styling ─────────────────────────────────────────
  // Uses full-data stats (not kpiStats which tracks the zoom window) so this
  // memo only invalidates when the raw data changes, keeping the Chart.js
  // instance alive across zoom/pan operations.
  const annotatedDatasets = React.useMemo(() => {
    if (!data.datasets?.length) return data.datasets;
    const mainDs = data.datasets.find((ds: any) => ds.label !== 'Average' && !ds.label?.startsWith('__'));
    const fullStats = mainDs ? computeKPIs(mainDs.data as (number | null)[], []) : null;
    return data.datasets.map((ds) => {
      if (ds.label === 'Average' || ds.label?.startsWith('__')) return ds;
      if (!fullStats) return ds;
      const { pointBg, pointRadius } = computeAnomalyColors(
        ds.data as (number | null)[],
        fullStats.avg,
        fullStats.stdDev
      );
      return { ...ds, pointBackgroundColor: pointBg, pointRadius };
    });
  }, [data.datasets]);

  // ── Combined chart data — stable reference unless data/thresholds change ──
  // Keeping this reference stable prevents PrimeReact Chart's React.memo from
  // bailing and calling initChart() (destroy+recreate) on unrelated re-renders
  // (timer ticks, kpiStats updates), so the Chart.js instance — and its zoom
  // plugin state — survives across zoom interactions.
  const chartData = React.useMemo(() => ({
    labels: data.labels,
    datasets: [
      ...annotatedDatasets.filter(
        (ds: any) => ds.label === selectedAttribute || ds.label === 'Average'
      ),
      ...thresholdDatasets,
    ],
  }), [data.labels, annotatedDatasets, thresholdDatasets, selectedAttribute]);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportPNG = () => {
    const chartEl = (chartRef.current as any)?.getChart?.();
    if (!chartEl) return;
    const url = chartEl.toBase64Image("image/png", 1);
    const a = document.createElement("a");
    const assetName = (productName || selectedAssetData?.product_name || "asset")
      .replace(/\s+/g, "_");
    a.download = `${assetName}_${selectedAttribute}_${format(new Date(), "yyyyMMdd_HHmmss")}.png`;
    a.href = url;
    a.click();
  };

  const handleExportCSV = () => {
    if (!data.labels?.length || !data.datasets?.length) return;
    const mainDs = data.datasets.find((ds) => ds.label !== 'Average' && !ds.label?.startsWith('__'));
    if (!mainDs) return;
    // Read the current visible x range from the live chart instance
    const chartEl = (chartRef.current as any)?.getChart?.();
    const xMin: number | undefined = chartEl?.scales?.x?.min;
    const xMax: number | undefined = chartEl?.scales?.x?.max;
    const allLabels = data.labels as string[];
    const rows = allLabels
      .map((label, i) => ({ label, value: mainDs.data[i] }))
      .filter(({ label }) => {
        if (xMin == null || xMax == null) return true; // no zoom — export all
        const t = new Date(label).getTime();
        return t >= xMin && t <= xMax;
      })
      .map(({ label, value }) => [`"${label}"`, value ?? ""].join(","));
    const csv = ["timestamp,value", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const assetName = (productName || selectedAssetData?.product_name || "asset")
      .replace(/\s+/g, "_");
    a.download = `${assetName}_${selectedAttribute}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetZoom = () => {
    const chartEl = (chartRef.current as any)?.getChart?.();
    if (chartEl) {
      // Flag tells onZoomComplete (which the plugin fires after resetZoom)
      // to skip setHasZoomed(true) so the button stays hidden after reset.
      isResettingRef.current = true;
      chartEl.resetZoom();
    }
    setHasZoomed(false);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      cardRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
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


  // ── Freshness indicator helpers ──────────────────────────────────────────
  const freshnessClass =
    selectedInterval !== "live"
      ? ""
      : secondsSinceUpdate > 60
      ? "freshness-stale"
      : secondsSinceUpdate > 30
      ? "freshness-warn"
      : "freshness-ok";

  const freshnessLabel =
    selectedInterval !== "live"
      ? null
      : secondsSinceUpdate < 5
      ? "Just now"
      : `${secondsSinceUpdate}s ago`;

  return (
    <div className="data_viewer_card" ref={cardRef}>
      <div className="grid p-fluid">
        <div className="col-12">

          {/* ── Controls row ───────────────────────────────────────────── */}
          <div className="control-container">
            <div className="control_form_field">
              <label htmlFor="attribute" className="dashboard_control_label">
                {t("dashboard:selectAttribute")}
                {selectedInterval === "live" && (
                  <span className={`live-pulse-dot ${freshnessClass}`} title={freshnessLabel ?? ""} />
                )}
              </label>
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
                <Image src="/dropdown-icon.svg" width={8} height={14} alt="" />
              </div>
              {freshnessLabel && (
                <span className={`freshness-label ${freshnessClass}`}>Live · {freshnessLabel}</span>
              )}
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
                  placeholder={t("dashboard:select_interval")}
                  appendTo="self"
                  panelClassName="global_dropdown_panel"
                />
                <Image src="/dropdown-icon.svg" width={8} height={14} alt="" />
              </div>
            </div>

            {selectedInterval === "custom" && (
              <div className="control_form_field">
                <label htmlFor="" className="dashboard_control_label">{t("dashboard:pick_timeframe")}</label>
                <Button className="timeframe_op_trigger" onClick={(e) => op.current?.toggle(e)}>
                  <Image src="/dashboard-collapse/calendar_icon.svg" width={16} height={16} alt="" />
                  <div>{selectedDate ? formatDateWithTimeRange(selectedDate, startTime, endTime) : t("dashboard:pick_date")}</div>
                  <Image src="/dropdown-icon.svg" width={8} height={14} alt="" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Toolbar row: thresholds + export + zoom reset + fullscreen ─ */}
          <div className="chart-toolbar">
            <div className="chart-toolbar-left">
              <button className="chart-tool-btn chart-tool-btn-limits" onClick={(e) => thresholdOp.current?.toggle(e)} title="Set alert limit lines on the chart">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                Set Limits
              </button>
            </div>
            <div className="chart-toolbar-right">
              {hasZoomed && (
                <button className="chart-tool-btn chart-tool-btn-accent" onClick={handleResetZoom} title="Reset zoom to full time range">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                  Reset View
                </button>
              )}
              <button className="chart-tool-btn" onClick={handleExportCSV} title="Download data as CSV spreadsheet">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/><rect x="3" y="19" width="18" height="2" rx="1"/></svg>
                Export CSV
              </button>
              <button className="chart-tool-btn" onClick={handleExportPNG} title="Download chart as PNG image">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                Export PNG
              </button>
              <button className="chart-tool-btn" onClick={handleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}>
                {isFullscreen
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>}
              </button>
            </div>
          </div>

          {/* ── Threshold OverlayPanel ────────────────────────────────────── */}
          <OverlayPanel ref={thresholdOp} className="timeframe_overlaypanel threshold-panel">
            <div className="threshold-panel-header">
              <div>
                <div className="threshold-panel-title">Set Limit Lines</div>
                <div className="threshold-panel-subtitle">Draw horizontal lines on the chart to mark safe operating ranges.</div>
              </div>
              <button className="threshold-panel-close" onClick={() => thresholdOp.current?.hide()} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="threshold-grid">
              <div className="control_form_field">
                <label className="dashboard_control_label threshold-label-alarm">Upper Alarm</label>
                <InputText
                  value={upperAlarm}
                  onChange={(e) => updateThreshold("upperAlarm", e.target.value)}
                  placeholder="e.g. 95"
                  className="threshold-input"
                  keyfilter="num"
                />
              </div>
              <div className="control_form_field">
                <label className="dashboard_control_label threshold-label-warn">Upper Warning</label>
                <InputText
                  value={upperWarning}
                  onChange={(e) => updateThreshold("upperWarning", e.target.value)}
                  placeholder="e.g. 80"
                  className="threshold-input"
                  keyfilter="num"
                />
              </div>
              <div className="control_form_field">
                <label className="dashboard_control_label threshold-label-warn">Lower Warning</label>
                <InputText
                  value={lowerWarning}
                  onChange={(e) => updateThreshold("lowerWarning", e.target.value)}
                  placeholder="e.g. 20"
                  className="threshold-input"
                  keyfilter="num"
                />
              </div>
              <div className="control_form_field">
                <label className="dashboard_control_label threshold-label-alarm">Lower Alarm</label>
                <InputText
                  value={lowerAlarm}
                  onChange={(e) => updateThreshold("lowerAlarm", e.target.value)}
                  placeholder="e.g. 5"
                  className="threshold-input"
                  keyfilter="num"
                />
              </div>
            </div>
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="chart-tool-btn"
                onClick={resetThresholds}
                title="Clear all limit lines for this attribute"
                style={{ color: "var(--color-alert, #ef4444)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Reset Limits
              </button>
            </div>
          </OverlayPanel>

          {/* ── Live stats strip ──────────────────────────────────────────── */}
          {kpiStats && !loading && !noChartData && entityIdValue && (
            <div className="kpi-strip">
              <div className="kpi-tile kpi-tile-current">
                <div className="kpi-tile-header">
                  <span className="kpi-tile-label">Current Value</span>
                  <span className={`kpi-trend kpi-trend-${kpiStats.trend}`} title={kpiStats.trend === "up" ? "Trending up" : kpiStats.trend === "down" ? "Trending down" : "Stable"}>
                    {kpiStats.trend === "up" ? "↑" : kpiStats.trend === "down" ? "↓" : "→"}
                  </span>
                </div>
                <span className="kpi-tile-value">{parseFloat(kpiStats.last.toFixed(4))}</span>
              </div>
              <div className="kpi-tile kpi-tile-low">
                <span className="kpi-tile-label">Low</span>
                <span className="kpi-tile-value">{parseFloat(kpiStats.min.toFixed(4))}</span>
              </div>
              <div className="kpi-tile kpi-tile-high">
                <span className="kpi-tile-label">High</span>
                <span className="kpi-tile-value">{parseFloat(kpiStats.max.toFixed(4))}</span>
              </div>
              <div className="kpi-tile kpi-tile-avg">
                <span className="kpi-tile-label">Average</span>
                <span className="kpi-tile-value">{parseFloat(kpiStats.avg.toFixed(4))}</span>
              </div>
              <div className="kpi-tile kpi-tile-var">
                <span className="kpi-tile-label">Variation (σ)</span>
                <span className="kpi-tile-value">{parseFloat(kpiStats.stdDev.toFixed(4))}</span>
              </div>
              {kpiStats.anomalyCount > 0 && (
                <div className="kpi-tile kpi-tile-anomaly">
                  <span className="kpi-tile-label">⚠ Spikes</span>
                  <span className="kpi-tile-value kpi-anomaly-count">{kpiStats.anomalyCount}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Timeframe overlay panel ───────────────────────────────────── */}
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
                  placeholder={t("dashboard:start_time")}
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
                  placeholder={t("dashboard:end_time")}
                  className="w-full"
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
              onClick={handleLoad}
            />
          </OverlayPanel>

          {/* ── Chart area ────────────────────────────────────────────────── */}
          <div style={{ position: "relative" }}>
            {!entityIdValue ? (
              <div className="chart-empty-state">
                <p><b>{t("dashboard:no_asset_selected")}</b></p>
                <img src="/no-chart-data.png" alt="" width="5%" height="15%" />
              </div>
            ) : loading ? (
              <div className="chart-loading-state">
                <ProgressSpinner />
              </div>
            ) : data.datasets && data.datasets.length > 0 && !noChartData ? (
              <Chart
                key={selectedAttribute + "_" + selectedInterval}
                ref={chartRef}
                type="line"
                data={chartData}
                options={chartOptionsWithZoomPan}
                style={{ height: "60vh" }}
              />
            ) : (
              <div className="chart-empty-state">
                <p>{t("no_chart_data")}</p>
                <img src="/no-chart-data.png" alt="" width="5%" height="15%" />
              </div>
            )}
          </div>

          {/* ── Machine state band legend ─────────────────────────────────── */}
          {machineStateBands.length > 0 && !loading && entityIdValue && (
            <div className="machine-state-legend">
              <span className="ms-legend-item"><span className="ms-dot ms-dot-running" />{t("dashboard:running")}</span>
              <span className="ms-legend-item"><span className="ms-dot ms-dot-idle" />{t("dashboard:online")}</span>
              <span className="ms-legend-item"><span className="ms-dot ms-dot-offline" />{t("dashboard:offline")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombineSensorChart;

