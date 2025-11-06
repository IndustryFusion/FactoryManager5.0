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

import { useEffect, useState } from "react";
import { getAlerts, postStatusForAlert } from "./alert-service";
import { getJobs, Job } from "./job-service";
import axios from "axios";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import AlertDetails from "./alert-details";
import { Asset } from "@/types/asset-types";
import Image from "next/image";
import { useTranslation } from "next-i18next";
interface Alerts {
  text: string;
  resource: string;
  severity: string;
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Alerts = () => {
// State hooks for alerts, alert count, alert visibility, and asset data
  const [alerts, setAlerts] = useState([]);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [isAlert, setIsAlert] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [assetData, setAssetData] = useState<any>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsCount, setJobsCount] = useState<number>(0);
  const { t } = useTranslation(["navigation"]);

  // Function to map backend data to asset state
  const mapBackendDataToAssetState = (backendData: Asset) => {
    const modifiedObject:any = {};
    // Iterate over the properties of the object
    Object.keys(backendData).forEach((key) => {
      if (key.includes("/")) {
        const newKey = key.split('/').pop() || '';
        modifiedObject[newKey] = backendData[key].type === "Property" ? backendData[key].value : backendData[key];
      } else {
        modifiedObject[key] = backendData[key];
      }
    });
    return modifiedObject;
  };

  // Function to fetch asset data by asset ID
  const fetchAssetData = async (assetId: string) => {
    try {
      const response = await axios.get(API_URL + `/asset/get-asset-by-id/${assetId}`, {
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

  const handleAcknowledge = async (id: string, status: string) => {
    try {
      const response = await postStatusForAlert(id, { status, text: 'Manual change.' });
      if (response.status === 'ok') {
        // Optionally, you can update the local state to reflect the acknowledged status
        const response = await getAlerts();
        setAlerts(response.alerts);
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

 // useEffect hook to fetch all alerts, jobs and their associated asset data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch jobs
        const jobResponse = await getJobs();
        setJobs(jobResponse.jobs || []);
        setJobsCount(jobResponse.jobs?.length || 0);

        const alertResponse = await getAlerts();
        setAlerts(alertResponse.alerts || []);
        setAlertsCount(alertResponse.alerts?.length || 0);
        
        // Fetch asset data for alerts
        const assetsData = [];
        for (const alert of alertResponse.alerts) {
          const response = await fetchAssetData(alert.resource);
          assetsData.push(response)
        }
        setAssetData(assetsData);
      } catch (error) {
        console.log("Error from @components/alert/alert.tsx",error)
      }
    }
    fetchAllData();
  }, [])

// CSS style for badge position and appearance
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-2px',
    right: '1px',
    fontSize: '0.2rem',
  };

  // Calculate total count for badge (alerts + jobs)
  const totalCount = alertsCount + jobsCount;

  return (
    <>
      <div style={{
        position: 'relative',
        display: 'inline-block',
        width: "40px",
      }}>
        <Button
          icon={<Image src="/navbar/alert_icon.svg" width={18} height={18} alt="Alerts Icon"/>}
          link
          className="nav_icon_button"
          onClick={() => {
            setIsAlert(true);
            setVisible(true)
          }}
          tooltip={t("navbar.alerts")}
          tooltipOptions={{ position: 'bottom' }}
          // style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
        />
        <div style={badgeStyle}>
          <Badge className={`p-badge ${totalCount > 5 ? "active" : ""}`} value={totalCount} />
        </div>
      </div>
      {isAlert &&
        <AlertDetails
          alertsCount={alertsCount}
          jobsCount={jobsCount}
          alerts={alerts}
          jobs={jobs}
          visible={visible}
          setVisible={setVisible}
          assetData={assetData}
          handleAcknowledge={handleAcknowledge}
        />
      }
    </>
  )
}

export default Alerts;