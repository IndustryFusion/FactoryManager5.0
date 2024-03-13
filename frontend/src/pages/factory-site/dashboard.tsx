


import { useContext, useEffect, useState } from "react";
import { LayoutContext } from './layout/layoutcontext';
import axios from "axios";
import DashboardAssets from "@/components/dashboard/dashboard-assets";
import HorizontalNavbar from "@/components/horizontal-navbar";
import "../../styles/dashboard.css"
import DashboardChart from "@/components/dashboard/dashboard-chart";
import DashboardCards from "@/components/dashboard/dashboard-cards";
import CombineSensorChart from "@/components/dashboard/senosor-linear-charts";
import PowerCo2Chart from "@/components/dashboard/power-co2-chart";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { DashboardProvider, useDashboard } from "@/context/dashboardContext";
import { fetchAsset } from "@/utility/asset-utility";

const ALERTA_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Dashboard = () => {

  const [count, setCount] = useState(0);
  const [machineState, setMachineState] = useState("0");
  const { layoutConfig } = useContext(LayoutContext);
  const router = useRouter();
  // const {setEntityIdValue} = useDashboard();


  const fetchNotifications = async () => {
    try {
      const response = await axios.get(ALERTA_URL + "/alerts", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      })
      console.log(response, "what i'm getting in alerts");
    } catch (error) {
      console.error("Error:", error);
    }
  }
  
 
  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { } = router.query;
        fetchNotifications();
      }
    }
    
  }, [router.isReady])


  return (
    <>
    <DashboardProvider>
      <div className="dashboard-container" style={{ zoom: "95%" }}>
        <HorizontalNavbar />
        <DashboardCards  />
        <div className="flex flex-column md:flex-row" style={{height:"80%", width:"100%" }}>
          <div className="flex border-round m-2" style={{width:"77%"}}>
            <div className="card h-auto" style={{width:"100%"}} >
              <CombineSensorChart />
            </div>
          </div>
          <DashboardAssets />
        </div>
        <div className="flex flex-column md:flex-row" style={{height:"100%", width:"100%"}}>
          <div className="flex border-round m-2" style={{width:"65%", margin: 0}}>
            <PowerCo2Chart />
          </div>
          <DashboardChart/>
          </div>     
      </div>
      </DashboardProvider>
    </>
  )
}

export default Dashboard;