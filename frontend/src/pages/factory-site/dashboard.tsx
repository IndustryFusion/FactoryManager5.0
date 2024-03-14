


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
import { ProgressSpinner } from "primereact/progressspinner";

const ALERTA_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Dashboard = () => {

  const [count, setCount] = useState(0);
  const [machineState, setMachineState] = useState("0");
  const { layoutConfig } = useContext(LayoutContext);
  const [blocker, setBlocker]= useState(false);
  const [countDown, setCountDown] = useState(0);
  const [runTimer, setRunTimer] = useState(false);
  const router = useRouter();



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

// Effect to start the timer when blocker is true
useEffect(() => {
  if (blocker && !runTimer) {
     setRunTimer(true);
     setCountDown(60 * 5); // Set countdown to 5 minutes
  }
 }, [blocker, runTimer]);
 
 // Effect to manage the countdown timer
 useEffect(() => {
  let timerId;
 
  if (runTimer) {
     timerId = setInterval(() => {
       setCountDown((countDown) => countDown - 1);
     }, 1000);
  } else {
     clearInterval(timerId);
  }
 
  return () => clearInterval(timerId);
 }, [runTimer]);


useEffect(() => {
 if (countDown < 0 && runTimer) {
    console.log("expired");
    setRunTimer(false);
    setCountDown(0);
 }
}, [countDown, runTimer]);



  return (
    <>
    <DashboardProvider>
      {blocker && 
      <div className="blocker">
        <div className="card blocker-card">
          <p>Restart the Machine to finish onboarding</p>
          <div className="loading-spinner">
          <ProgressSpinner />
          </div>
          <div>
          <p>Time Remaining:
            <span style={{color:"red",marginRight:"5px"}}>{Math.floor(countDown / 60)}:{countDown % 60 < 10 ? '0' : ''}{countDown % 60}</span>
              mins</p>
          </div>
        </div>
      </div>
      }
      <div className="dashboard-container" style={{ zoom: "95%" }}>
        <HorizontalNavbar />
        <DashboardCards  />
        <div className="flex flex-column md:flex-row" style={{height:"80%", width:"100%" }}>
          <div className="flex border-round m-2" style={{width:"77%"}}>
            <div className="card h-auto" style={{width:"100%"}} >
              <CombineSensorChart />
            </div>
          </div>
          <DashboardAssets setBlockerProp={setBlocker}/>
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