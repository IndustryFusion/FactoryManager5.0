import { useEffect, useState } from "react";
import { getAlerts } from "./alert-service";
import axios from "axios";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import AlertDetails from "./alert-details";

interface Alerts {
  text: string;
  resource: string;
  severity: string;
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [isAlert, setIsAlert] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [assetData, setAssetData] = useState<any>([])

  const mapBackendDataToAssetState = (backendData: any) => {
    // console.log(backendData, "is any data");

    const modifiedObject: any = {};
    // Iterate over the properties of the object
    Object.keys(backendData).forEach((key) => {
      if (key.includes("http://www.industry-fusion.org/schema#")) {
        const newKey = key.replace("http://www.industry-fusion.org/schema#", "");
        modifiedObject[newKey] = backendData[key].type === "Property" ? backendData[key].value : backendData[key];
      } else {
        modifiedObject[key] = backendData[key];
      }
    });
    return modifiedObject;
  };

  const fetchAssetData = async (assetId: string) => {
    try {
      const response = await axios.get(API_URL + `/asset/${assetId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      })
      
    return mapBackendDataToAssetState(response.data);
    } catch (error) {
      console.error("Error fetching asset data", error)
    }
  }


  
  useEffect(() => {
    const fetchAllAlerts = async () => {
      try {
        const response = await getAlerts();
         setAlerts(response.alerts)
        setAlertsCount(response.total);
        const assetsData  =[];
        for (const alert of response.alerts) {
          // assetsData.push( fetchAssetData(alert.resource));
          const response = await fetchAssetData(alert.resource);
          assetsData.push(response )
        // console.log("response",response);
        
        }
        setAssetData(assetsData);
      } catch (error) {
        // console.error(error)
      }
    }
    fetchAllAlerts();
  }, [])


  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-2px',
    right: '1px',
    fontSize: '0.2rem',
  };

  return (
    <>
      <div style={{
        position: 'relative', display: 'inline-block', paddingBottom: "1rem",
        background: "#fff",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        color: "#615e5e"
      }}>
        <Button
          icon="pi pi-bell"
          link
          className="mr-2 "
          onClick={() => {
            setIsAlert(true);
            setVisible(true)
          }}
          tooltip="Alerts"
          tooltipOptions={{ position: 'bottom' }}
        />
        <div style={badgeStyle}>
          <Badge className={`p-badge ${alertsCount > 5 ? "active" : ""}`} value={alertsCount} />
        </div>
      </div>
      {isAlert &&
        <AlertDetails
          count={alertsCount}
          alerts={alerts}
          visible={visible}
          setVisible={setVisible}
          assetData={assetData}
        />
      }
    </>
  )
}

export default Alerts;