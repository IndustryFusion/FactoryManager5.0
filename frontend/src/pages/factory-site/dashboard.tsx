
import { DataTable } from "primereact/datatable";
import "../../styles/dashboard.css"
import { Chart } from "primereact/chart";
import { useContext, useEffect, useState } from "react";
import { ChartData, ChartOptions } from 'chart.js';
import { Column } from "primereact/column";
import { LayoutContext } from './layout/layoutcontext';
import { Asset } from "@/interfaces/assetTypes";
import { fetchAsset } from "@/utility/asset-utility";
import axios from "axios";
import { Button } from "primereact/button";
import { GiVendingMachine } from "react-icons/gi";
import type { ChartOptionsState } from './types/layout';

export interface Datasets {
  label?: string;
  data: number[];
  fill: boolean;
  backgroundColor: string;
  borderColor: string;
  tension?: number;
}

interface ChartDataState extends ChartData<"line", number[], string> {
  datasets: Datasets[];
}

export interface pgData {
  observedAt: string;
  attributeId: string;
  value: string;
}


const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const ALERTA_URL = process.env.NEXT_PUBLIC_BACKEND_ALERTA_URL;
const ALERT_KEY = process.env.NEXT_PUBLIC_BACKEND_ALERT_KEY;

const Dashboard = () => {

  const [count, setCount] = useState(0);
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [machineState, setMachineState] = useState("0");
  const [timer, setTimer] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [options, setOptions] = useState<ChartOptionsState>({});

  const { layoutConfig } = useContext(LayoutContext);

  const productNameBodyTemplate = (rowData: any) => {
    return <>{rowData?.product_name}</>;
  };
  const assetTypeBodyTemplate = (rowData: any) => {
    const assetType = rowData?.type?.split('/')[5];
    return <>{assetType}</>;
  };
  const productIconTemplate = (rowData: any) => {
    return rowData?.product_icon ? (
      <img
        src={rowData?.product_icon}
        alt={rowData?.product_name}
        style={{ width: "70px", height: "auto" }}
      />
    ) : (
      <span>No Image</span>
    );
  };

  const handleAsset = async () => {
    try {
      const response = await fetchAsset();
      if (response !== undefined) {
        setAssetData(response);
      } else {
        console.error("Fetch returned undefined");
      }

    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    handleAsset();
  }, [])

  const mapBackendDataToAssetState = (backendData: any) => {
    const modifiedObject: any = {};
    // Iterate over the properties of the object
    Object.keys(backendData).forEach((key) => {
      if (key.includes("http://www.industry-fusion.org/fields#")) {
        const newKey = key.replace("http://www.industry-fusion.org/fields#", "");
        modifiedObject[newKey] = backendData[key].type === "Property" ? backendData[key].value : backendData[key];
      } else {
        modifiedObject[key] = backendData[key];
      }
    });
    return modifiedObject;
  };

  const fetchData = async (attributeId: string, entityId: string) => {
    const labelValue = attributeId ? String(attributeId.split("#").pop()) : "";
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
    try {
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

      const factoryData = response.data;
      console.log('factoryData ', factoryData);
      factoryData.forEach((data: pgData) => {
        const date = new Date(data.observedAt);
        const formattedDate = date.toISOString().slice(0, 16).replace('T', ' ');
        labels.push(formattedDate);
        datasets[0].data.push(Number(data.value));
      });



      return { datasets, labels };

    } catch (error) {
      console.error("Error fetching asset data:", error);
      throw error;
    }

  }
  const fetchAssets = async (assetId: string) => {
    console.log(assetId, "getting assetId")
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
      const updatedData = mapBackendDataToAssetState(response.data);
      console.log(assetData, "what's the data");
      setMachineState(updatedData["machine-state"])
      // setMachineState("0")

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
      let entityId = 'urn:ngsi-ld:asset:2:101';
      let attributeIds: string[] | undefined = await fetchAssets(entityId);
      const lineOptions: ChartOptions = {
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            // ticks: {
            //   autoSkip: false,
            //   maxTicksLimit: 20,
            //   callback: function (label, index, labels) {

            //     console.log(label+ "its label value", index + "its index value", labels + "its labels value");

            //     // Check if this is a tick we want to show based on the index
            //     if (index % 3 === 0) {
            //       // Parse the timestamp into a Date object
            //       const dateObj = new Date(label);
            //       // Format the date and time
            //       const formattedDate = dateObj.toLocaleDateString('en-US'); // Adjust for your locale
            //       const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            //       // Return the combined date and time string
            //       return `${formattedDate} ${formattedTime}`;
            //     } else {
            //       // For other ticks, return an empty string to hide them
            //       return '';
            //     }
            //   },
            // },
          }
          ,
          y: {
            ticks: {

              callback: function (value, index, values) {
                if (value === 2) {
                  return 'Online';
                } else if (index === 0) {
                  return 'Offline';
                } else {
                  return;
                }
              }
            }
          }
        }

      }
      if (attributeIds)
        // console.log(attributeIds[2], "attributeId here")

        if (attributeIds && attributeIds.length > 0) {
          const datasetsArray = [];

          const { labels, datasets } = await fetchData(attributeIds[2], 'eq.' + entityId);
          console.log('labels ', labels);

          const lineData: ChartData = {
            labels,
            datasets
          }
          setChartData(prevData => [...prevData, lineData]);

        } else {
          console.log('No attribute set available');
        }
      setOptions({
        lineOptions
      });
    }

    fetchDataAndAssign();
  }, [layoutConfig])


  useEffect(() => {
    let interval: any;
    if (machineState === "2") {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else if (machineState === "0") {
      setTimer(0);
    }

    return () => {
      clearInterval(interval);
    }

  }, [machineState])

  const formatTime = (timeInSeconds: any) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };


  return (
    <>
      <div className="grid p-4">
        <div className="col-12 lg:col-6 xl:col-3">
          <div className="card mb-0">
            <div className="flex justify-content-between mb-3">
              <div>
                <span className="block text-500 font-medium mb-3">Machine State</span>
                <div className="text-900 font-medium text-xl">{machineState == "2" ? "Online" : "Offline"}</div>
              </div>
              <div className={`flex align-items-center justify-content-center border-round  ${machineState === "2" ? 'active-state' : 'inactive-state'}`}
                style={{ width: '2.5rem', height: '2.5rem' }}>
                <GiVendingMachine className={` ${machineState === "2" ? 'active-icon' : 'inactive-icon'}`} />
              </div>
            </div>

          </div>
        </div>
        <div className="col-12 lg:col-6 xl:col-3">
          <div className="card mb-0">
            <div className="flex justify-content-between mb-3">
              <div>
                <span className="block text-500 font-medium mb-3">Running Since</span>
                <div className="text-900 font-medium text-xl">{formatTime(timer)}</div>

              </div>
              <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-map-marker text-orange-500 text-xl" />
              </div>
            </div>


          </div>
        </div>
        <div className="col-12 lg:col-6 xl:col-3">
          <div className="card mb-0">
            <div className="flex justify-content-between mb-3">
              <div>
                <span className="block text-500 font-medium mb-3">Relations</span>
                <div className="flex gap-1">
                  <p className=" m-0 text-900 font-medium text-xl">4</p>
                  <span className="relation-text">child objects</span>
                </div>
              </div>
              <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-inbox text-cyan-500 text-xl" />
              </div>
            </div>


          </div>
        </div>
        <div className="col-12 lg:col-6 xl:col-3">
          <div className="card mb-0">
            <div className="flex justify-content-between mb-3">
              <div>
                <span className="block text-500 font-medium mb-3">Notifications</span>
                <div className="text-900 font-medium text-xl">152 Unread</div>
              </div>
              <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className="pi pi-comment text-purple-500 text-xl" />
              </div>
            </div>


          </div>
        </div>
      </div>
      <div className="flex px-4">
        <div className="col-12 xl:col-6">
          <div className="card">
            <h5 className="heading-text">Assets</h5>
            <DataTable
              rows={5}
              paginator
              value={assetData}

            >
              <Column
                header="Product Image"
                field="product_icon"
                body={productIconTemplate}
              />
              <Column
                header="Product Name"
                field="product_name"
                body={productNameBodyTemplate}
              />
              <Column
                header="AssetType"
                field="asset_type"
                body={assetTypeBodyTemplate}
              />
              <Column
                header="View"
                style={{ width: '15%' }}
                body={() => (
                  <>
                    <Button icon="pi pi-search" text />
                  </>
                )}
              />
            </DataTable>
          </div>
        </div>
        <div className="col-12 xl:col-6">
          <div className="card">
            <h5 className="heading-text">Machine State Overview</h5>

            {chartData.map((value) => (

              <Chart type="line" data={value} options={options.lineOptions}></Chart>

            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard;