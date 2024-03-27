import React, { useContext, useEffect, useRef, useState } from "react";
import { ChartData, ChartOptions } from "chart.js";
import { Chart } from "primereact/chart";
import axios from "axios";
import { LayoutContext } from "../../pages/factory-site/layout/layout-context";
import { Asset } from "@/interfaces/asset-types";
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
  FaBolt,
  FaHourglassHalf 

} from "react-icons/fa";
import "../../styles/combine-chart.css";
import { useDashboard } from "@/context/dashboard-context";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const graphMapping: any = {
  dustiness: "/graph-combine-chart.svg",
  humidity: "/graph-combine-chart2.svg",
  noise: "/graph-combine-chart3.svg",
  temperature: "/graph-combine-chart4.svg",
 "power-consumption": "/graph-combine-chart4.svg",
  "operating-hours": "/graph-combine-chart4.svg",
};


type AttributeOption = {
  selectedDatasetIndex:number,
  label: string;
  value: string;
};

// Define the state type for chart data
interface ChartDataState extends ChartData<"line", number[], string> {
  datasets: Datasets[];
}
const iconMapping: any = {
  dustiness: <FaCloud style={{ color: "#cccccc", marginRight: "8px" }} />,
   dustiness1: <FaCloud style={{ color: "#cccccc", marginRight: "8px" }} />,
  humidity: <FaTint style={{ color: "#00BFFF", marginRight: "8px" }} />,
  noise: <FaWind style={{ color: "#696969", marginRight: "8px" }} />,
  temperature: (
    <FaTemperatureHigh style={{ color: "#FF4500", marginRight: "8px" }} />
  ),
  "power-consumption": <FaBolt style={{ color: "#ffd700", marginRight: "8px" }} />, 
  "operating-hours": <FaHourglassHalf style={{ color: "#6a5acd", marginRight: "8px" }} />,
};

const CombineSensorChart: React.FC = () => {

  const [data, setChartData] = useState<ChartDataState>({
    labels: [],
    datasets: [],
  });
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(0); // State to store the index of the selected dataset
  const { layoutConfig } = useContext(LayoutContext);
  const [selectedInterval, setSelectedInterval] = useState<number>(1); // Default selected interval
  const [dataCache, setDataCache] = useState<DataCache>({});
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const intervalId: any = useRef(null);
  const { entityIdValue, setEntityIdValue, autorefresh, selectedAssetData } = useDashboard();
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState();
  const [productName, setProductName] = useState<string>("");

  // console.log("first row entityIdValue", entityIdValue);

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
   // Start loading
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

     
      setLoading(false) 
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



      // const attributeIds: string[] = Object.keys(assetData)
      //   .filter((key) => key.includes("fields"))
      // .map(key => {
      //   const parts = key.split("#");
      //   return parts[1] || key; // Return the part after "#" if exists
      // });
       
      // return attributeIds;

     const attributeLabels: AttributeOption[] = Object.keys(assetData)
      .filter(key => key.includes("fields" ))
      .map(key => {
        let index = 0;
        const label = key.split("#")[1] || key;
        return { label, value: label, selectedDatasetIndex:index+1 };
      })
      .filter(attribute => attribute.value !== "machine-state"); 

    setAttributes(attributeLabels);

    // Return attributeIds for compatibility with existing code
    return Object.keys(assetData)
      .filter(key => key.includes("fields"  ))
      .map(key => "eq." + key);
    } catch (error) {
      console.error("Error fetching asset data:", error);
    }
  };

// console.log(entityIdValue, "in sensor chart");


    const fetchDataAndAssign = async () => {
    try {
      
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

            
            const updatedLabels = generateLabels(
            new Date(), // Use current time
            selectedInterval,
            labels.length // Use the same length as the existing labels
          );

            chartData.labels = updatedLabels;

             
      
            chartData.datasets.push(newDataset);
          }
        }


        setChartData(chartData);
        console.log("apple ", chartData)
      } else {
        console.log("No attribute set available");
         setChartData({
          labels: [],
          datasets: [],
        });
      }
    }catch(error){
      console.error("Failed to fetch and assign data:", error);
    }
    
  }
   

  useEffect(() => {
 
    setChartData({ labels: [], datasets: [] });
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { } = router.query;
        if (autorefresh === true) {
          console.log("is sensor-chart autoreferssh");
          intervalId.current = setInterval(() => {
            fetchDataAndAssign();
          }, 10000);
          
        } else {
          fetchDataAndAssign();
        }
      }
    }
    return () => {
          if (intervalId.current) {
            clearInterval(intervalId.current);
          }
        };

  }, [selectedInterval, router.isReady, entityIdValue, autorefresh]);

  return (
    <div style={{ zoom: "80%" }}>
      {/* <BlockUI blocked={loading}> */}
      <h3 style={{ marginLeft: "30px", fontSize: "20px" }}>
        {selectedAssetData?.product_name === undefined ?
          "Unknown Product" : selectedAssetData?.product_name
        }</h3>
      <div className="grid p-fluid">
        <div className="col-12">
            <div className="control-container">
              <div className="attribute-dropdown-container">
                <p className="font-bold">Select Attributes</p>
                <Dropdown
                  value={selectedAttribute}
                  options={attributes}
                  onChange={(e) => {
                    const selectedIndex = data.datasets.findIndex(dataset => dataset.label === e.value);
                    if (selectedIndex !== -1) {
                      setSelectedDatasetIndex(selectedIndex);
                    }
                    setSelectedAttribute(e.value);
                  }}
                  placeholder="Please Select"
                  filter
                  showClear
                  filterBy="label,value"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="custom-button-container">
                  <div className="custom-button">
                    <img src="/dashboard-field-icon.png" style={{ width: "7%", marginRight: "8px" }} alt="Field Icon" />
                    <span className="button-text">{selectedAttribute || 'Select an Attribute'}</span>
                  </div>
                </div>

            {/* {selectedAttribute && (
              <div className="custom-button-container">
                <div className="custom-button">
                  {/* {iconMapping[selectedAttribute?.toLowerCase()] || <FaIndustry style={{ marginRight: "8px" }} />} */}
                  {/* <img src="/dashboard-field-icon.png" style={{width:"7%"}}></img>
                  <span className="button-text">{selectedAttribute}</span>
                </div>
              </div> */}
            {/* )} */} 
            <div className="interval-dropdown-container">
              <p className="font-bold">Interval</p>
              <Dropdown
                value={selectedInterval}
                options={intervalButtons.map(({ label, interval }) => ({
                  label,
                  value: interval,
                }))}
                onChange={(e) => setSelectedInterval(e.value)}
                placeholder="Select an Interval"
                // style={{ width: "100%", border: "none" }}
                className="w-full sm:w-14rem" 
              />
            </div>
          </div>
             {/* {data.datasets.map((dataset, index) => (
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
            ))}  */}
            
            {/* <div className="interval-filter-container">
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
                  onChange={(e) => setSelectedInterval(e.value)} // Update selectedInterval state on change
                  placeholder="Select an Interval"
                  style={{ width: "100%", border: "none" }} // Make dropdown fill the container
                />
              </div>
            </div>
           */}
    


          <div>
        { !loading && data.datasets.length > 0 ? (
              <Chart
               key={entityIdValue} 
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

        </div>
      </div>
      {/* </BlockUI> */}
   
    </div>
  );
};

export default CombineSensorChart;
