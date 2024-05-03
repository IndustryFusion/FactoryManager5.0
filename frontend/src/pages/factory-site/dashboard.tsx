

import dynamic from 'next/dynamic';
import { useContext, useEffect, useState,useRef } from "react";
import { LayoutContext } from './layout/layout-context';
import axios from "axios";
import HorizontalNavbar from "@/components/horizontal-navbar";
import "../../styles/dashboard.css"
const CombineSensorChart = dynamic(
  () => import('@/components/dashboard/senosor-linear-charts'),
  { ssr: false }
);
const AutoRefresh = dynamic(() => import("@/components/dashboard/auto-refresh"), { ssr: false });
const DashboardAssets = dynamic(() => import("@/components/dashboard/dashboard-assets"), { ssr: false });
const DashboardChart = dynamic(() => import("@/components/dashboard/dashboard-chart"), { ssr: false });
const PowerCo2Chart = dynamic(() => import("@/components/dashboard/power-co2-chart"), { ssr: false });
const DashboardCards = dynamic(() => import('../../components/dashboard/dashboard-cards'), { ssr: false, loading: () => <ProgressSpinner /> });
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { DashboardProvider, useDashboard } from "@/context/dashboard-context";
import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Toast, ToastMessage } from "primereact/toast";
import Footer from '@/components/footer';



const ALERTA_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Dashboard = () => {

  const [count, setCount] = useState(0);
  const [machineState, setMachineState] = useState("0");
  const { layoutConfig } = useContext(LayoutContext);
  const [blocker, setBlocker]= useState(false);
  const [countDown, setCountDown] = useState(0);
  const [runTimer, setRunTimer] = useState(false);
  const [prefixedAssetProperty, setPrefixedAssetProperty]= useState([]);
  const router = useRouter();
  const toast = useRef<any>(null);


  const fetchNotifications = async () => {
    try {
      const response = await axios.get(ALERTA_URL + "/alerts", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      })
      // console.log(response, "what i'm getting in alerts");
    } catch (error) {
      console.error("Error:", error);
    }
  }
  const DashboardCards = dynamic(() => import('../../components/dashboard/dashboard-cards'), {
    ssr: false,
   });
  
  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
  };

  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { } = router.query;
        fetchNotifications();
        let timerId:any;
   
    // Start the timer if blocker is true and runTimer is false
    if (blocker && !runTimer) {
       setRunTimer(true);
       setCountDown(60 * 5); 
       showToast('success', "Success", "Added To GitHub Successfully")
       // Set countdown to 5 minutes
    }
   
    // Manage the countdown timer
    if (runTimer) {
       timerId = setInterval(() => {
         setCountDown((countDown) => countDown - 1);
       }, 1000);
    } else {
       clearInterval(timerId);
    }
   
    // Handle countdown expiration
    if (countDown === 0 && runTimer) {
       console.log("expired");
       setRunTimer(false);
       setCountDown(0);
       setBlocker(false);
    }
  //   if (prefixedAssetProperty.length === 0) {
  //     setBlocker(true);
  //     setRunTimer(true);
  //     setCountDown(60 * 5); // Reset countdown to 5 minutes
  //  }
   
    // Cleanup function to clear the interval
    return () => clearInterval(timerId);
      }   
    }   
  }, [router.isReady,blocker, runTimer, countDown, prefixedAssetProperty.length, layoutConfig ])

  //  console.log(prefixedAssetProperty , "prefix value here");

  return (
    <>
    <DashboardProvider>
      {blocker && 
      <div className="blocker">
        <Toast ref={toast} />
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
          <div className="flex justify-content-end">
          <Button
                label="Cancel"
                severity="danger" outlined
                className="mr-2"
                type="button"
                onClick={() => setBlocker(false)}
            />
          </div>
        </div>
      </div>
      }
      <div className="dashboard-container" style={{ zoom: "95%" }}>
        <HorizontalNavbar />
       <AutoRefresh />
        <DashboardCards  />
        <div className="flex flex-column md:flex-row my-3 gap-2" style={{height:"80%", width:"100%" }}>
          <div className="flex border-round m-2" style={{width:"77%"}}>
            <div className="card h-auto" style={{width:"100%"}} >
              <CombineSensorChart />
            </div>
          </div>
          <DashboardAssets 
          setBlockerProp={setBlocker}
          setPrefixedAssetPropertyProp={setPrefixedAssetProperty}
          />
        </div>
        <div className="flex flex-column md:flex-row mt-3 gap-2 mb-5" style={{height:"100%", width:"100%"}}>
          <div className="flex border-round mx-2" style={{width:"65%", margin: 0}}>
            <PowerCo2Chart />
          </div>
          <DashboardChart/>
          </div>     
      </div>
      <Footer />
    </DashboardProvider>
    </>
  )
}

export default Dashboard;