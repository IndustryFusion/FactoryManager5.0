
import dynamic from 'next/dynamic';
import React, { useContext, useEffect, useRef, useState } from "react";
import { ChartData, ChartOptions, registerables ,TooltipItem, ChartType, ScriptableContext} from "chart.js";
import { Chart } from "primereact/chart";
import axios from "axios";
import { LayoutContext } from "../../pages/factory-site/layout/layout-context";
import { Asset } from "@/interfaces/asset-types";
import { Dropdown   } from "primereact/dropdown";
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
import { Calendar } from 'primereact/calendar';
import moment from 'moment';
import { Button } from 'primereact/button';
import { useSelector } from "react-redux";
import { RootState } from "@/state/store";


// Register the zoom plugin
ChartJS.register(zoomPlugin);

interface DropdownChangeEvent {
  value: any;  // Use a more specific type if possible
  originalEvent: React.SyntheticEvent;
  target: {
    name: string;
    id: string;
    value: any;
  };
}


interface DataItem {
    observedAt: string;
    attributeId: string;
    value: string; // Adjust the type if 'value' is expected to be a number or any other type
}

interface DataItem {
  observedAt: string;
  attributeId: string;
  value: string;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

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
  const [selectedInterval, setSelectedInterval] = useState<string>("live"); // Default selected interval
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const [noChartData, setNoChartData] = useState(false)
  const { setEntityIdValue, selectedAssetData } = useDashboard();
  const entityIdValue = useSelector((state: RootState) => state.entityId.id);
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
  const [selectedDate, setSelectedDate] = useState<Date | Date[] | undefined>(undefined);
  const [startTime, setStartTime] = useState<Date | Date[] | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | Date[] | undefined>(undefined);
  const [minDate, setMinDate] = useState<Date | undefined>(undefined);

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
    tooltip: {
      enabled: true, // Enable tooltips for interactivity
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context: TooltipItem<"line">) {
          return `${context.dataset.label}: ${context.parsed.y}`;
        },
        title: function(context: TooltipItem<"line">[]) {
        
          return format(new Date(context[0].parsed.x), 'PPpp'); 
        }
      }
    },
    datalabels: {
      display: false,
    },
    zoom: {
      pan: {
        enabled: true,
        mode: 'xy',
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: 'xy',
      },
    },
  },
  scales: {
    x: {
      type: 'time',
      time: {
        tooltipFormat: 'PPpp', // Full date with time
        displayFormats: {
          millisecond: 'MMM dd, yyyy HH:mm:ss',
          second: 'MMM dd, yyyy HH:mm:ss',
          minute: 'MMM dd, yyyy HH:mm',
          hour: 'MMM dd, yyyy HH:mm',
          day: 'MMM dd, yyyy',
          week: 'MMM dd, yyyy',
          month: 'MMM yyyy',
          quarter: 'QQQ yyyy',
          year: 'yyyy'
        }
      },
      ticks: {
        source: 'auto',
        maxTicksLimit: 20,
        major: {
          enabled: true
        },
        callback: function(val: number | string, index: number) {
          const labelDate = new Date(val);
          return format(labelDate, 'MMM dd, yyyy HH:mm');
        }
      },
      title: {
        display: true,
        text: ''
      }
    },
    y: {
      type: 'linear',
      beginAtZero: true,
      title: {
        display: true,
        text: 'Value'
      }
    }
  },
};
const formatAttributeName = (attributeName:string) => {
  // Convert attribute name to camel case
  const camelCaseName = attributeName.replace(/-([a-z])/g, (match, letter) => ` ${letter.toUpperCase()}`);
  // Capitalize the first letter
  return camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
};
function formatLabel(date:Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

  const fetchAsset = async (entityIdValue: string) => {
    
    try {
      const response = await axios.get(`${API_URL}/asset/${entityIdValue}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      
      const assetData: Asset = response.data;
      const creationDate = assetData["http://www.industry-fusion.org/schema#creation_date"]?.value;
       if (creationDate) {
        const [month, day, year] = creationDate.split('.');
        setMinDate(new Date(year, month - 1, day));
      }
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
    const existingAttribute = attributeLabels.find(attr => attr.value === selectedAttribute);

    if (existingAttribute) {
      setSelectedAttribute(existingAttribute.value);
    } else {
      setSelectedAttribute(attributeLabels.length > 0 ? attributeLabels[0].value : "");
    }
    return Object.keys(assetData)
      .filter(key => key.includes("fields"  ))
      .map(key => "eq." + key);
    }
     catch (error) {

    setAttributes([]);
    setSelectedAttribute(""); // Reset if an error occurs or no attributes are available
    }
  };

const handleAttributeChange = (selectedValue: string) => {
 setChartData({
        labels: [],
        datasets: []
    });
    setSelectedAttribute(selectedValue);  // Set the attribute then fetch
};

const handleIntervalChange = (e: any) => {
    const newInterval = e.value;
    console.log(`Interval changed to: ${newInterval}`);
    setSelectedInterval(newInterval);
    setChartData({
        labels: [],
        datasets: []
    });
};
const fetchDataForAttribute = async (attributeId:string, entityIdValue:string, selectedInterval:string) => {
  setChartData({
        labels:[],
        datasets: []
      });
  setLoading(true); // Start loading
  if (!entityIdValue) {
    console.error("Entity ID is missing");
    return;
  }

  await fetchAsset(entityIdValue)
  const params = {
    intervalType: selectedInterval,
    order: "observedAt.desc",
    entityId: `eq.${entityIdValue}`,
    attributeId: `eq.${attributeId}`,
  };

  // Customize parameters for custom intervals
  if (selectedInterval === 'custom' && selectedDate && startTime instanceof Date && endTime instanceof Date) {
  
    const startDate = new Date(selectedDate);
    startDate.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
    const endDate = new Date(selectedDate);
    endDate.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
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

    console.log(response.data, "kkk")

    if (!response.data || response.data.length === 0) {
      setNoChartData(true);
      console.error("No data returned from the API.");
      return;
    }

    const factoryData = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
    const labels = factoryData.map(data => formatLabel(new Date(data.observedAt)));
    const dataPoints = factoryData.map(data => data.value ? Number(data.value) : null);

    const newDataset = {
      label: attributeId.replace('eq.', ''),
      data: dataPoints,
      fill: true,
      borderColor: colors[0 % colors.length].borderColor,
      backgroundColor: 'rgba(122, 162, 227, 0.2)',
      tension: 0.4,
    };

    console.log("selectedInterval", selectedInterval)
      if( selectedInterval !="custom" ){
        setChartData(prevData => ({
        ...prevData,
        labels,
        datasets: [...prevData.datasets, newDataset]
      }));
      }
      else{
        setChartData({
        labels,
        datasets: [newDataset]
      });
      }
      console.log("chartData", data)
    setSelectedAttributeId(`eq.${attributeId}`);
    setLoading(false)
    setNoChartData(false);
  } catch (error) {
    console.error("Error fetching data for attribute:", error);
    setNoChartData(true);
  }
};


const handleDateChange = async(e:any) => {
    setSelectedDate(e.value as Date);
    console.log("Selected date changed to:", e.value);
};

const handleStartTimeChange = async (e) => {
    const timeValue = Array.isArray(e.value) ? e.value[0] : e.value;
    if (selectedDate && timeValue) {
        const updatedDate = new Date(selectedDate);
        updatedDate.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds());
        setStartTime(updatedDate);
       
    } else {
        setStartTime(timeValue);
    }
};

const handleEndTimeChange = async (e) => {
  
    const timeValue = Array.isArray(e.value) ? e.value[0] : e.value;
    if (selectedDate && timeValue) {
        const updatedDate = new Date(selectedDate);
        updatedDate.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds());
        setEndTime(updatedDate);
       
    } else {
        setEndTime(timeValue);
       
    }
};

function updateChartDataWithSocketData(currentChartData:ChartDataState, newData: DataItem[]) {
  let dataChanged = false;  // A flag to detect if data actually changed
  const newChartData = {
    ...currentChartData,
    labels: currentChartData.labels ? [...currentChartData.labels] : [], // Ensure labels is an array
    datasets: currentChartData.datasets.map(ds => ({ ...ds })) // Clone datasets for immutability
  };
 
  
  newData.forEach(dataItem => {
    const { observedAt, attributeId, value } = dataItem;

    // Clean the attributeId by removing the URL prefix
    const cleanAttributeId = attributeId.replace('http://www.industry-fusion.org/fields#', '');

    // Skip updates for the machine-state attribute
    if (cleanAttributeId === 'machine-state') {
      console.log("Skipping machine-state attribute update");
      return;
    }

    // Attempt to find the dataset with the cleaned attributeId
    const datasetIndex = newChartData.datasets.findIndex(ds => ds.label === cleanAttributeId);
    if (datasetIndex === -1) {
      console.log(`Dataset not found for attribute ${cleanAttributeId}, skipping data item`);
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
        ds.data.push(index === datasetIndex ? numericValue : null);  // Append null to other datasets to maintain alignment
      });
      dataChanged = true;  // Mark that data has changed
    } else {
      // If label is found, update the existing value at the correct index
      newChartData.datasets[datasetIndex].data[labelIndex] = numericValue;
      dataChanged = true;  // Mark that data has changed
    }
  });

  if (dataChanged) {
    // If data has changed, re-sort the data based on labels to maintain chronological order
    const sortedIndices = newChartData.labels.map((label, index) => ({ label, index }))
      .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime())
      .map(data => data.index);

    newChartData.labels = sortedIndices.map(index => newChartData.labels[index]);  // Sort labels
    newChartData.datasets.forEach(ds => {
      ds.data = sortedIndices.map(index => ds.data[index]);  // Sort each dataset's data array
    });

    return newChartData;  // Return the updated chart data
  } else {
    return currentChartData;  // Return the original chart data if no changes were made
  }
}

  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } 
  }, [ router.isReady]);

useEffect(() => {
    if (selectedInterval === 'custom') {
        if (!startTime || !endTime) {
            return; 
        } 
        
    }

      console.log("called mania")
      fetchDataForAttribute(selectedAttribute, entityIdValue, selectedInterval);
    
    
    
}, [,router.isReady, selectedInterval, entityIdValue, selectedAttribute]); 

useEffect(() => {
 
  const socket = socketIOClient(`${API_URL}/`);
  socketRef.current = socket;

    socketRef.current.on("dataUpdate", (updatedData:any) => {
      console.log("dataUpdate", updatedData)
       
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
    }
  }
};
const handleLoad = async () => {
  if (!selectedDate || !startTime || !endTime) {
    console.error("Selected date, start time, or end time is missing.");
    return;
  }

  setLoading(true); 
  await fetchDataForAttribute(selectedAttribute, entityIdValue, selectedInterval);
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

  return (
    <div style={{ zoom: "80%" }}>
      <div className="custom-button-container">
          <div className="custom-button">
              <img src="/data-transfer.png" style={{ width: "15%", marginRight: "15px" }} alt="Field Icon" />
              <span className="button-text">
                 {formatAttributeName(selectedAttribute) || 'Select an Attribute'}
              </span>
          </div>
       </div>
      <div className="grid p-fluid">
        <div className="col-12">
            <div className="control-container">
              <div className="attribute-dropdown-container">
                <p className="font-bold">Select Attributes</p>
                    <Dropdown
                      value={selectedAttribute || 'Select an Attribute'}
                      options={attributes}
                      onChange={(e) => handleAttributeChange(e.value)}
                      placeholder="Select an Attribute"
                      style={{ width: '100%' }}
                    />
              </div>
            <div className="interval-dropdown-container">
              <p className="font-bold">Interval</p>
              <Dropdown
                value={selectedInterval}
                options={intervalButtons.map(({ label, interval }) => ({
                  label,
                  value: interval,
                }))}
                onChange={handleIntervalChange}
                placeholder="Select an Interval"
                
                className="w-full sm:w-14rem" 
              />
            </div>
            
          <div className="date-time-container">
                <p className="font-bold">Select Date and Time</p>
                <div className="date-time-flex">
                  <Calendar 
                    value={selectedDate} 
                    onChange={(e) => handleDateChange(e)}
                    showTime={false} 
                    dateFormat="yy-mm-dd" 
                    placeholder="Select a Date"
                    className="w-full sm:w-auto" 
                    minDate={minDate} 
                    maxDate={new Date()}
                    disabled={selectedInterval !== 'custom'}
                  />
                  <Calendar 
                    value={startTime}
                    onChange={handleStartTimeChange}
                    showTime={true} 
                    timeOnly={true} 
                    hourFormat="24" 
                    placeholder="Start Time"
                    className="w-full sm:w-6rem"
                    disabled={selectedInterval !== 'custom'}
                    maxDate={endTime ? new Date(endTime.getTime() - 60000) : null}
                  />
                  <Calendar 
                    value={endTime}
                    onChange={handleEndTimeChange}
                    showTime={true} 
                    timeOnly={true} 
                    hourFormat="24" 
                    placeholder="End Time"
                    className="w-full sm:w-6rem"
                    disabled={selectedInterval !== 'custom'}
                    minDate={startTime ? new Date(startTime.getTime() + 60000) : null}
                      />
                  <Button 
                    label="Load" 
                    severity="info" 
                    disabled={selectedInterval !== 'custom'}
                    style={{ width: "100px" }}
                    onClick={handleLoad} // Call the handleLoad function when the button is clicked
                  />
                </div>
              </div>
          </div>
        <div>
         {!entityIdValue ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh',
              }}>
                <p><b>No Asset Selected !! Please Select an asset ...</b></p>
                <img src="/noDataFound.png" alt="" width="8%" height="25%" />
              </div>
            ) : loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh',
              }}>
                <ProgressSpinner />
              </div>
            ) : (
              data.datasets && data.datasets.length > 0 && !noChartData ? (
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
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '60vh',
                }}>
                  <p>No data available</p>
                  <img src="/noDataFound.png" alt="" width="10%" height="25%" />
                </div>
              )
            )}

        </div>
        </div>
      </div>
    </div>
  );
};

export default CombineSensorChart;
