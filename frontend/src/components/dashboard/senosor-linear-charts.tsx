
import dynamic from 'next/dynamic';
import React, { useContext, useEffect, useRef, useState } from "react";
import { ChartData, ChartOptions,registerables  } from "chart.js";
import { Chart } from "primereact/chart";
import axios from "axios";
import { LayoutContext } from "../../pages/factory-site/layout/layout-context";
import { Asset } from "@/interfaces/asset-types";
import { Dropdown } from "primereact/dropdown";
import { Datasets, pgData, DataCache } from "../../pages/factory-site/types/combine-linear-chart";
import { ProgressSpinner } from "primereact/progressspinner";
import socketIOClient from "socket.io-client";
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

import ChartJS from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

import { format, differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths,differenceInYears ,differenceInWeeks} from 'date-fns';
import { skip } from 'node:test';


// Register the zoom plugin
ChartJS.register(zoomPlugin);


interface DataPoint {
  observedAt: string;
  attributeId: string;
  value: number;
}


interface NewDataItem {
  observedAt: string; 
  value: string; 
}
interface DataItem {
  observedAt: string;
  attributeId: string;
  value: string;
}

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

interface ChartDataState extends ChartData<'line', (number | null)[], string> {
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

  const socketRef = useRef<any>(null);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<number>(0); // State to store the index of the selected dataset
  const { layoutConfig } = useContext(LayoutContext);
  const [selectedInterval, setSelectedInterval] = useState<number>(10); // Default selected interval
  const [dataCache, setDataCache] = useState<DataCache>({});
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const intervalId: any = useRef(null);
  const [noChartData, setNoChartData] = useState(false)
  const { entityIdValue, setEntityIdValue, autorefresh, selectedAssetData } = useDashboard();
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState("");
  const [productName, setProductName] = useState<string>("");
  const chartRef = useRef<ChartJS>(null);
  const [zoomLevel, setZoomLevel] = useState({min: null, max: null});
  const [zoomState, setZoomState] = useState({
    x: {min: undefined, max: undefined},
    y: {min: undefined, max: undefined}
  });
const [selectedAttributeId, setSelectedAttributeId] = useState("");



  const intervalButtons = [
    { label: "Live", interval: 10 },
    { label: "1 Min", interval: 20 },
    { label: "2 Min", interval: 30 },
    { label: "3 Min", interval: 50 },
    { label: "15 Min", interval: 150 },
    { label: "2 Hour", interval: 120 },
    { label: "3 Hours", interval: 240 },
    // { label: "3 Hours", interval: 180 },
    { label: "1 Day", interval: 1440 },
    { label: "1 Week", interval: 10080 },
    { label: "1 Month", interval: 43200 },
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



const getLabelFormat = (minDate:any, maxDate:any) => {
  const minuteDiff = differenceInMinutes(maxDate, minDate);
  const hourDiff = differenceInHours(maxDate, minDate);
  const dayDiff = differenceInDays(maxDate, minDate);
  const monthDiff = differenceInMonths(maxDate, minDate);
  const yearDiff = differenceInYears(maxDate, minDate);

  if (minuteDiff <= 60) {
    return 'mm:ss';
  } else if (hourDiff <= 24) {
    return 'HH:mm';
  } else if (dayDiff <= 7) {
    return 'MMM dd HH:mm';
  } else if (monthDiff <= 12) {
    return 'MMM yyyy';
  } else {
    return 'yyyy';
  }
};



const chartOptions = {

  animation: {
      duration: 0, 
    },
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
     tooltip: {
      enabled: false, // Disable tooltip
    },
    datalabels: {
    display: false,
  },
    zoom: {
      pan: {
        enabled: true,
        mode: 'xy',
      },
       onZoom: function({chart}) {
        const xAxis = chart.scales.x;
        setZoomLevel({
          min: xAxis.min,
          max: xAxis.max
        });
        adjustTimeUnitBasedOnZoom(chart);
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: 'xy',
        onZoom: function({chart}) {
          adjustTimeUnitBasedOnZoom(chart);
        }
      },
    },
  },
  scales: {
    x: {
      type: 'time',
     time: {
      unit: 'minute', // Adjust based on your data's granularity
      displayFormats: {
        minute: 'HH:mm:ss'  // Ensure format is suitable for your labels
      }
    },
      ticks: {
        autoSkip: true,
        maxTicksLimit: 20, 
         ticks: {
          autoSkip: true,
          callback: function(val:any, index:any) {
            const labelDate = new Date(val);
            const formatStr = getLabelFormat(this.chart.scales.x.min, this.chart.scales.x.max);
            return format(labelDate, formatStr);
          }
        },
      }
    },
    title: {
          display: true,
          text: 'Time',
        },
     y: { // Y-axis configuration
      type: 'linear', 
      beginAtZero: true, 
    
    }
  
  },
  
};

function adjustTimeUnitBasedOnZoom(chart:any) {
  const xAxis = chart.scales.x;
  const minDate = new Date(xAxis.min);
  const maxDate = new Date(xAxis.max);
  
  // Calculate the differences using date-fns functions
  const minuteDiff = differenceInMinutes(maxDate, minDate);
  const hourDiff = differenceInHours(maxDate, minDate);
  const dayDiff = differenceInDays(maxDate, minDate);
  const monthDiff = differenceInMonths(maxDate, minDate);

  // Adjust the unit and display formats based on the difference
  if (minuteDiff <= 60) {
    xAxis.options.time.unit = 'minute';
    xAxis.options.time.displayFormats = { minute: 'HH:mm' };
  } else if (hourDiff <= 24) {
    xAxis.options.time.unit = 'hour';
    xAxis.options.time.displayFormats = { hour: 'HH:mm' };
  } else if (dayDiff <= 30) {
    xAxis.options.time.unit = 'day';
    xAxis.options.time.displayFormats = { day: 'MMM d' };
  } else if (monthDiff <= 12) {
    xAxis.options.time.unit = 'month';
    xAxis.options.time.displayFormats = { month: 'MMM yyyy' };
  } else {
    xAxis.options.time.unit = 'year';
    xAxis.options.time.displayFormats = { year: 'yyyy' };
  }

  chart.update('none'); // Update the chart without animation
}

function generateLabels(
  baseDate: Date,
  selectedInterval: number,
  dataLength: number
) {
  const labels = [];
  // Start from the most recent (current) and go backwards directly
  for (let i = 0; i < 7; i++) {
    const adjustedDate = new Date(
      baseDate.getTime() - selectedInterval * 60000 * i
    );
    labels.unshift(formatLabel(adjustedDate)); // Insert at the beginning
  }
  return labels; // Now labels are in descending order without needing to reverse
}

const calculateLimit = (intervalMinutes: number): number => {
  const pointsPerMinute = 1; 
  return pointsPerMinute * intervalMinutes; // Adjusted to reflect no skipping
};


//  const fetchData = async (attributeId, entityId, index, selectedInterval) => {
//   try {
//     // Fetch data from the API using axios or any other method
//     const response = await axios.get(`${API_URL}/pgrest`, {
//       params: {
//         limit: 5,
//         order: "observedAt.desc",
//         entityId,
//       },
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       withCredentials: true,
//     });

//     // Extract data from the response
//     const factoryData = response.data;

//     // Initialize arrays to hold labels and data points
//     let labels = [];
//     let dataPoints = [];

//     // Filter the data based on the attributeId
//     factoryData.forEach(data => {
//       if (data.attributeId === attributeId) {
//         labels.push(formatLabel(new Date(data.observedAt)));
//         dataPoints.push(data.value ? Number(data.value) : null);
//       }
//     });

//     // Create a new dataset object
//     const newDataset = {
//       label: attributeId,
//       data: dataPoints,
//       fill: false,
//       borderColor: colors[index % colors.length].borderColor,
//       backgroundColor: colors[index % colors.length].backgroundColor,
//       tension: 0.4,
//     };

//     // Return the new dataset and labels
//     return { newDataset, labels };
//   } catch (error) {
//     console.error("Error fetching asset data:", error);
//     throw error;
//   }
// };
function formatLabel(date:Date) {
  // Format date: "YYYY-MM-DD HH:mm:ss"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
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

     const attributeLabels: AttributeOption[] = Object.keys(assetData)
      .filter(key => key.includes("fields" ))
      .map(key => {
        let index = 0;
        const label = key.split("#")[1] || key;
        return { label, value: label, selectedDatasetIndex:index+1 };
      })
      .filter(attribute => attribute.value !== "machine-state"); 

    setAttributes(attributeLabels);
    if (attributeLabels.length > 0  && !selectedAttribute) {
        setSelectedAttribute(attributeLabels[0].value);
        
        // setSelectedDatasetIndex(0);
      }


    // Return attributeIds for compatibility with existing code
    return Object.keys(assetData)
      .filter(key => key.includes("fields"  ))
      .map(key => "eq." + key);
    } catch (error) {
      console.error("Error fetching asset data:", error);
    }
  };

// console.log(entityIdValue, "in sensor chart");
const skipInterval = 3; // Define the interval to skip
let skipCounter = 0; // Initialize skip counter



const fetchDataAndAssign = async (entityIdValue:string) => {
  try {
    let entityId = entityIdValue;
    console.log("selected asset entityId ", entityId);

    // Clear existing chart data before fetching new
    setChartData({
      labels: [],
      datasets: [],
    });

    let attributeIds = await fetchAsset(entityId); // Fetch attribute IDs from the API

    if (attributeIds && attributeIds.length > 0) {
     
      setNoChartData(false);
      const chartData = { labels: [], datasets: [] };

      // Initialize an array to hold the data for each attribute label
      const dataByLabel = new Map();

      // Fetch data for each attribute ID and assign to chartData
      for (let i = 0; i < attributeIds.length; i++) {
        if (attributeIds[i].includes('machine-state')) {
        // console.log(attributeIds[i])
          continue;
        }

        const response = await axios.get(`${API_URL}/pgrest`, {
          params: {
            limit: calculateLimit(selectedInterval),
            order: "observedAt.desc",
            entityId: "eq." + entityId,
            attributeId: attributeIds[i],
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });

        const factoryData = response.data;

        let labels:any = [];
        let dataPoints:any = [];

        factoryData.forEach(data => {
          labels.push(formatLabel(new Date(data.observedAt)));
          dataPoints.push(data.value ? Number(data.value) : null);
        });

        const newDataset = {
          label: attributeIds[i].replace('eq.', ''),
          data: dataPoints,
          fill: false,
          borderColor: colors[i % colors.length].borderColor,
          backgroundColor: colors[i % colors.length].backgroundColor,
          tension: 0.4,
          stepped: true,
        };

        chartData.labels = labels;
        chartData.datasets.push(newDataset);
      }

      // Set chart data
      setChartData(chartData);

      // Set selected attribute
      if (chartData.datasets.length > 0) {
        setSelectedAttribute(chartData.datasets[0].label);
      }

      console.log("apple ", data);
    } else {
      // No attribute IDs available
      setNoChartData(true);
    }
  } catch (error: any) {
    // Handle errors
    console.error("Error:", error);
    // Display error message to the user
    // showToast('error', 'Error', error.message);
  }
};


const handleAttributeChange = (selectedValue: string) => {
  const modifiedAttributeName = `http://www.industry-fusion.org/fields#${selectedValue}`;
  setSelectedAttribute(modifiedAttributeName);
  setSelectedAttributeId(selectedValue);
  fetchDataForAttribute(modifiedAttributeName); // Fetch data based on the selected attribute
};

const fetchDataForAttribute = async (attributeId: string) => {
  // Add "eq." before the attributeId
  const modifiedAttributeId = "eq." + attributeId;

  // console.log(attributeId, "oooo");
  try {
    let entityId = entityIdValue;
    console.log("Selected attribute ID:", attributeId);

    const response = await axios.get(`${API_URL}/pgrest`, {
      params: {
        limit: "10",
        order: "observedAt.desc",
        entityId: "eq." + entityId,
        attributeId: modifiedAttributeId, // Use the modified attributeId
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    const factoryData = response.data;

    let labels:any = [];
    let dataPoints:any = [];

    factoryData.forEach(data => {
      labels.push(formatLabel(new Date(data.observedAt)));
      dataPoints.push(data.value ? Number(data.value) : null);
    });

    const newDataset = {
      label: attributeId.replace('eq.', ''), // Update the label
      data: dataPoints,
      fill: false,
      borderColor: colors[0 % colors.length].borderColor, // Assuming only one dataset is fetched for the selected attribute
      backgroundColor: colors[0 % colors.length].backgroundColor,
      tension: 0.4,
      stepped: true,
    };

    // Set chart data
    setChartData({
      labels: labels,
      datasets: [newDataset],
    });

    // Set selected attribute ID
    setSelectedAttributeId(modifiedAttributeId);

    setNoChartData(false);
  } catch (error) {
    console.error("Error fetching data for attribute:", error);
    setNoChartData(true);
  }
};



function updateChartDataWithSocketData(currentChartData: ChartDataState, newData: DataPoint[]): ChartDataState {
  // Iterate through each new data point
  newData.forEach(dataItem => {
    const { observedAt, attributeId, value } = dataItem;

    // Skip updates for the machine-state attribute
    if (attributeId.includes('http://www.industry-fusion.org/fields#machine-state')) {
       return;
    }

    // Find the correct dataset based on attributeId
    const datasetIndex = currentChartData.datasets.findIndex(dataset => dataset.label === attributeId);
    if (datasetIndex === -1) {
      // Dataset not found, skip this data item
      return;
    }

    // Parse the value to a numeric format if needed
    const numericValue = value

    // Format the observedAt timestamp
    const label = formatLabel(new Date(observedAt));

    // Find the index of the label in the current chart data
    const labelIndex:any = currentChartData.labels?.findIndex(existingLabel => existingLabel === label);
    if (labelIndex === -1) {
      // Label not found, append it to the labels array and ensure data integrity
      currentChartData.labels?.push(label);
      // Ensure all datasets have a value for this new label
      currentChartData.datasets.forEach((dataset, index) => {
        if (index === datasetIndex) {
          dataset.data.push(numericValue);
        } else {
          // Use the last value or null if it's the first entry
          const lastValue = dataset.data[dataset.data.length - 1] || null;
          dataset.data.push(lastValue);
        }
      });
    } else {
      // Label found, update the corresponding dataset with the new value
      currentChartData.datasets[datasetIndex].data[labelIndex] = numericValue;
    }
  });

  // Sort the chart data based on labels
  const sortedIndices = currentChartData.labels?.map((label, index) => ({ label, index }))
    .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime())
    .map(data => data.index);

  const sortedLabels = sortedIndices?.map(index => currentChartData.labels[index]);
  currentChartData.datasets.forEach(dataset => {
    dataset.data = sortedIndices?.map(index => dataset.data[index]);
  });

  currentChartData.labels = sortedLabels;

  return { ...currentChartData };
}


useEffect(() => {
  if ( selectedAttribute) {
    fetchDataForAttribute(selectedAttribute);
  }
}, [selectedAttribute]); // Depend on selectedAttribute and attributes to refetch when changed

useEffect(() => {
 
  const socket = socketIOClient(`${API_URL}/`);
  socketRef.current = socket;
 

    socketRef.current.on("dataUpdate", (updatedData:any) => {

   
        try {
            const transformedData = updateChartDataWithSocketData(data, updatedData);
            setChartData(currentData => updateChartDataWithSocketData(currentData, updatedData));
        } catch (error) {
            console.error("Error processing data update:", error);
        }
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
    }
  }
};


useEffect(() => {
  if (chartRef.current && zoomLevel.min && zoomLevel.max) {
 
    const chartInstance = chartRef.current.chart;
    if (chartInstance) {
      const xAxis = chartInstance.scales['x-axis-0']; 
      if (xAxis) {
        xAxis.options.ticks.min = zoomLevel.min;
        xAxis.options.ticks.max = zoomLevel.max;
        chartInstance.update();
      }
    }
  }
}, [data, zoomLevel]);

  useEffect(() => {
 
    
   
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } 
    else {
          console.log("is calling when eneityId changes");

        fetchDataAndAssign (entityIdValue)
      }
      


    
    
   
        

  }, [ router.isReady, entityIdValue, selectedInterval]);




  return (
    <div style={{ zoom: "80%" }}>
    
     
    
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
              value={selectedAttribute.replace('http://www.industry-fusion.org/fields#', '') || 'Select an Attribute'}
              options={attributes.map(attr => ({ label: attr.label, value: attr.value.replace('http://www.industry-fusion.org/fields#', '') }))}
              onChange={(e) => handleAttributeChange(e.value)}
              placeholder="Select an Attribute"
              filter
              showClear
              style={{ width: '100%' }}
            />
              </div>
              <div className="custom-button-container">
                  <div className="custom-button">
                    <img src="/data-transfer.png" style={{ width: "7%", marginRight: "8px" }} alt="Field Icon" />
                   <span className="button-text">
                    {selectedAttribute.replace('http://www.industry-fusion.org/fields#', '') || 'Select an Attribute'}
                  </span>
                  </div>
                </div>

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
                
                className="w-full sm:w-14rem" 
              />
            </div>
          </div>
           

        <div>
        
        {data.datasets && data.datasets.length > 0 && !noChartData ? (
        <Chart
          key={JSON.stringify(data)} 
          type="line"
         data={{
            ...data,
            datasets: data.datasets.filter(dataset => dataset.label === selectedAttribute)
          }}
          options={chartOptionsWithZoomPan}
   
          style={{ height: "60vh" }}
        />
      
          ) :
          (
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
  
   
    </div>
  );
};

export default CombineSensorChart;
