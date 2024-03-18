import React, { useContext, useEffect, useState } from "react";
import { ChartData, ChartOptions } from "chart.js";
import { Chart } from "primereact/chart";
import axios from "axios";
import { LayoutContext } from "../../pages/factory-site/layout/layoutcontext";
import { Asset } from "@/interfaces/assetTypes";
import { Button } from "primereact/button";
import { Image } from "primereact/image";
import { Dropdown } from "primereact/dropdown";
import { Datasets, pgData, DataCache } from "../../pages/factory-site/types/combine-linear-chart";
import { ProgressSpinner } from "primereact/progressspinner";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import {
  FaIndustry,
  FaWind,
  FaTint,
  FaTemperatureHigh,
  FaCloud,
} from "react-icons/fa";
import "../../styles/combine-chart.css";
import { useDashboard } from "@/context/dashboardContext";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const graphMapping: any = {
  dustiness: "/graph-combine-chart.svg",
  humidity: "/graph-combine-chart2.svg",
  noise: "/graph-combine-chart3.svg",
  temperature: "/graph-combine-chart4.svg",
};

// Define the state type for chart data
interface ChartDataState extends ChartData<"line", number[], string> {
  datasets: Datasets[];
}
const iconMapping: any = {
  dustiness: <FaCloud style={{ color: "#cccccc", marginRight: "8px" }} />,
  humidity: <FaTint style={{ color: "#00BFFF", marginRight: "8px" }} />,
  noise: <FaWind style={{ color: "#696969", marginRight: "8px" }} />,
  temperature: (
    <FaTemperatureHigh style={{ color: "#FF4500", marginRight: "8px" }} />
  ),
};

const CombineSensorChart: React.FC = () => {

  const [data, setChartData] = useState<ChartDataState>({
    labels: [],
    datasets: [],
  });
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(0); // State to store the index of the selected dataset
  const { layoutConfig } = useContext(LayoutContext);
  const [selectedInterval, setSelectedInterval] = useState<number>(1); // Default selected interval
  const [productName, setProductName] = useState<string>("");
  const [dataCache, setDataCache] = useState<DataCache>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const {entityIdValue, setEntityIdValue} = useDashboard();

  const intervalButtons = [
    { label: "1 Min", interval: 1 },
    { label: "3 Min", interval: 3 },
    { label: "5 Min", interval: 5 },
    { label: "30 Min", interval: 30 },
    { label: "1 Hour", interval: 60 },
    { label: "2 Hours", interval: 120 },
    { label: "3 Hours", interval: 180 },
    // { label: "1 Day", interval: 1440 },
    // { label: "1 Week", interval: 10080 },
    // { label: "1 Month", interval: 43200 },
  ];
  const colors = [
    {
      backgroundColor: "rgba(255, 99, 132, 0.5)", // Pink
      borderColor: "rgb(255, 99, 132)",
    },
    {
      backgroundColor: "rgba(54, 162, 235, 0.5)", // Blue
      borderColor: "rgb(54, 162, 235)",
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
  function generateLabels(
    baseDate: Date,
    selectedInterval: number,
    dataLength: number
  ) {
    const labels = [];
    // Start from the most recent (current) and go backwards directly
    for (let i = dataLength - 1; i >= 0; i--) {
      const adjustedDate = new Date(
        baseDate.getTime() - selectedInterval * 60000 * i
      );
      labels.unshift(formatLabel(adjustedDate)); // Insert at the beginning
    }
    return labels; // Now labels are in descending order without needing to reverse
  }
  const calculateLimit = (intervalMinutes: number): number => {
    const pointsPerMinute = 4; // Data is stored every 15 seconds
    const displayPoints = 10; // Desired points on the x-axis
    const skip = intervalMinutes * pointsPerMinute; // Points to skip to get one point per interval
    return skip * displayPoints; // Total limit
  };

  const fetchData = async (
    attributeId: string,
    entityId: string,
    index: number,
    selectedInterval: number
  ) => {
    setIsLoading(true); // Start loading
    const cacheKey = `${entityId}-${attributeId}-${selectedInterval}`;
    if (dataCache[cacheKey]) {
      return dataCache[cacheKey]; // Use cached data
    }
    const labelValue = attributeId ? String(attributeId.split("#").pop()) : "";
    const limit = calculateLimit(selectedInterval); // Calculate dynamic limit
    try {
      const response = await axios.get(`${API_URL}/pgrest`, {
        params: {
          limit,
          order: "observedAt.desc",
          attributeId: encodeURIComponent(attributeId),
          entityId,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      let factoryData: pgData[] = response.data;
      setIsLoading(false); // Stop loading once data is processed
      const skip = selectedInterval * 4; // Since data is recorded every 15 seconds, 4 data points per minute

      // Filter the data points based on the skip value
      let filteredDataPoints = factoryData
        .filter((_, index) => index % skip === 0)
        .slice(0, 10); // Ensure only 10 data points are selected
      const baseDate = new Date();
      let labels = generateLabels(
        baseDate,
        selectedInterval,
        filteredDataPoints.length
      );

      let dataPoints = filteredDataPoints.map((data) =>
        data.value ? Number(data.value) : null
      );
      // Reverse the order of labels and dataPoints to match increasing chronological order for the chart
      labels = labels.reverse();
      dataPoints = dataPoints.reverse();

      const newDataset: Datasets = {
        label: labelValue,
        data: dataPoints,
        fill: false,
        borderColor: colors[index % colors.length].borderColor,
        backgroundColor: colors[index % colors.length].backgroundColor,
        tension: 0.4,
      };
      const fetchedData = { newDataset, labels };
      setDataCache((prevCache) => ({
        ...prevCache,
        [cacheKey]: fetchedData,
      }));
      return fetchedData;
    } catch (error) {
      console.error("Error fetching asset data:", error);
      throw error;
    }
  };

  // Helper function to format label based on date and interval
  function formatLabel(date: Date) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // JS months are 0-based
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes =
      date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  const handleDatasetClick = (datasetIndex: number) => {
    // console.log("Dataset button clicked:", datasetIndex);
    setSelectedDatasetIndex(datasetIndex); // Update the selected dataset index
  };

  const fetchAsset = async (assetId: string) => {
    try {
      const response = await axios.get(`${API_URL}/asset/${assetId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      const assetData: Asset = response.data;
      const productName =
        assetData["http://www.industry-fusion.org/schema#product_name"]
          ?.value || "Unknown Product";
      setProductName(productName); // Set the product name in the state
      const attributeIds: string[] = Object.keys(assetData)
        .filter((key) => key.includes("fields"))
        .map((key) => "eq." + key);

      return attributeIds;
    } catch (error) {
      console.error("Error fetching asset data:", error);
    }
  };

console.log(entityIdValue, "in sensor chart");


  useEffect(() => {
    const fetchDataAndAssign = async () => {
      let entityId = entityIdValue;

      
      let attributeIds = await fetchAsset(entityId);
      if (attributeIds && attributeIds.length > 0) {
        const chartData: ChartDataState = { labels: [], datasets: [] };

        for (let i = 0; i < attributeIds.length; i++) {
          const { newDataset, labels } = await fetchData(
            attributeIds[i],
            "eq." + entityId,
            i,
            selectedInterval
          );

          // Exclude the dataset with the label "machine-state"
          if (newDataset.label !== "machine-state") {
            // console.log(`Dataset ${i}:`, newDataset); // Log each dataset

            if (i === 0) {
              chartData.labels = labels; // Use the correct property name
            }
            chartData.datasets.push(newDataset);
          }
        }

        // console.log("Final Chart Data:", chartData); // Log final chart data
        setChartData(chartData);
      } else {
        // console.log("No attribute set available");
      }
    };

    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const {} = router.query;
        fetchDataAndAssign();
      }
    }  
  }, [layoutConfig, selectedInterval, router.isReady, entityIdValue]);

  return (
    <div style={{zoom:"80%"}}>
      <h3 style={{ marginLeft: "30px", fontSize:"20px" }}>{productName}</h3>
      <div className="grid p-fluid">
        <div className="col-12">
          <div className="buttons-container">
            {data.datasets.map((dataset, index) => (
              <div
                key={index}
                className="custom-button"
                onClick={() => handleDatasetClick(index)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) =>
                  e.key === "Enter" && handleDatasetClick(index)
                }
              >
                <div className="content">
                  {/* Icon next to the label */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {iconMapping[dataset.label.toLowerCase()] || (
                      <FaIndustry style={{ marginRight: "8px" }} />
                    )}
                    <span className="button-text">{dataset.label}</span>
                  </div>
                  <Image
                    src={
                      graphMapping[dataset.label.toLowerCase()] ||
                      "default-icon-path"
                    }
                    alt={`${dataset.label}`}
                    className="button-icon"
                  />
                </div>
              </div>
            ))}
            <div className="interval-filter-container">
              <p>Filter Interval</p>
              <div
                className="dropdown-container custom-button"
                style={{ padding: "0" }}
              >
                <Dropdown
                  value={selectedInterval}
                  options={intervalButtons.map(({ label, interval }) => ({
                    label, // Text shown in the dropdown
                    value: interval, // Corresponding value
                  }))}
                  onChange={(e) => setSelectedInterval(e.value)} // Update selectedInterval state on change
                  placeholder="Select an Interval"
                  style={{ width: "100%", border: "none" }} // Make dropdown fill the container
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "60vh",
              }}
            >
              <ProgressSpinner />{" "}
              {/* This assumes you have a ProgressSpinner component */}
            </div>
          ) : (
            <div>
              {data.datasets.length > 0 ? (
                <Chart
                  type="line"
                  data={{
                    labels: data.labels,
                    datasets: [data.datasets[selectedDatasetIndex]],
                  }}
                  style={{ height: "60vh" }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "60vh",
                  }}
                >
                  <span>No data available</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombineSensorChart;
