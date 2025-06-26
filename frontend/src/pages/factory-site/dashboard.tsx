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

import dynamic from 'next/dynamic';
import { useEffect, useState,useRef } from "react";
import axios from "axios";
import "../../styles/dashboard.css"
const CombineSensorChart = dynamic(
  () => import('@/components/dashboard/senosor-linear-charts'),
  { ssr: false }
);
const AutoRefresh = dynamic(() => import("@/components/dashboard/dashboard-header"), { ssr: false });
const DashboardAssets = dynamic(() => import("@/components/dashboard/dashboard-assets"), { ssr: false });
const MachineStateChart = dynamic(() => import("@/components/dashboard/machine-state-chart"), { ssr: false });
const PowerCo2Chart = dynamic(() => import("@/components/dashboard/power-co2-chart"), { ssr: false });
import { useRouter } from "next/router";
import { DashboardProvider, useDashboard } from "@/context/dashboard-context";
import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Toast, ToastMessage } from "primereact/toast";
import Footer from '@/components/navBar/footer';
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import BlockTimer from '@/components/dashboard/block-timer';
import OnboardForm from '@/components/dashboard/onboard-form';
import Sidebar from '@/components/navBar/sidebar';
import Navbar from '@/components/navBar/navbar';
import "../../styles/factory-overview.css"
import "@/styles/sidebar.css"

interface PrefixedAssetProperty {
  key: string;
  value: string; 
}

const ALERTA_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Dashboard = () => {
  const [blocker, setBlocker]= useState(false);
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const [prefixedAssetProperty, setPrefixedAssetProperty]= useState<PrefixedAssetProperty[]>([]);
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const { t } = useTranslation('button');

  const DashboardCards = dynamic(() => import('../../components/dashboard/dashboard-cards'), {
    ssr: false,
   });

  return (
    <>
    <DashboardProvider>
      {blocker && 
     <BlockTimer
     setBlockerProp={setBlocker}
     blockerProp={blocker}
     />
      }
        <div className="flex">
          <Sidebar />
        <div className='main_content_wrapper'>
          <div className="navbar_wrapper">
            <Navbar navHeader="Data Viwer" />
          </div>
          <div className="data_viewer_wrapper">
          <DashboardAssets 
          setBlockerProp={setBlocker}
          setPrefixedAssetPropertyProp={setPrefixedAssetProperty}
          />
          {/* <AutoRefresh /> */}
          <DashboardCards  />
          <CombineSensorChart />
          <div className='dashboard_submap_wrapper'>
            <PowerCo2Chart />
            <MachineStateChart/>
          </div>
          </div>
          {/* <div className="">
          <div className="dashboard-container">      
       
        <div className="flex flex-column md:flex-row my-3 gap-2 mx-4" style={{height:"80%", width:"97%" }}>
          <div className="flex border-round m-2">
            <div className="card h-auto" style={{width:"100%"}} >
              
            </div>
          </div>
        </div>
        <div className="flex flex-column md:flex-row mt-3 gap-2 mb-5 mx-4">
          <div className="flex border-round mx-2">
            
          </div>
          
          </div>     
      </div>
          </div> */}
      </div>
      </div>
      {/* <Footer /> */}
    </DashboardProvider>
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'header',
        'button',
        'placeholder',
        'dashboard'
      ])),
    },
  }
}

export default Dashboard;