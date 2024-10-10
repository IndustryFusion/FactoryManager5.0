
import "../styles/certificates.css"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router';
import { Message } from 'primereact/message';
import { BiBuildings } from 'react-icons/bi';
import { TabPanel, TabView } from 'primereact/tabview';
import CompanyCertificates from '@/components/certificates/company';
import AssetsTab from '@/components/certificates/asset';
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";

const Certificates = () => {
   
    const [assetIfricId, setAssetIfricId] = useState<string | null>(null);
    const [isClientReady, setIsClientReady] = useState(false);
    const [certificateActiveTab, setCertificateActiveTab] = useState(0);
    const [isSidebarExpand, setSidebarExpand] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (router.query.asset_ifric_id) {
          setAssetIfricId(router.query.asset_ifric_id as string);
          setCertificateActiveTab(1);
        } else {
          setCertificateActiveTab(0);
        }
        setIsClientReady(true);
      }, [router.query]);

      const companyInfoText =
      "An active company certificate authorizes the company to actively participate in data contracts and sharing features.";
    const assetInfoText =
      "An active asset certificate allows the asset to participate in dataspace, secures data transfer and communication between assets with a digital signature.";
  
    if (!isClientReady) {
      return null;
    }


  return (
    <div>
        
  
        <div className="navbar_wrapper">
            <Navbar navHeader="Certificates"/>
            <div className="certificates-content-wrapper">
          <TabView
            className="certificates-tabview spaced-tabs"
            activeIndex={certificateActiveTab}
            onTabChange={(e) => setCertificateActiveTab(e.index)}
          >
            <TabPanel
              header={
                <span className="tab-header">
                  <BiBuildings className="mr-2" style={{fontSize:"30px"}}/>
                  <span>Company</span>
                </span>
              }
              className="spaced-tab-panel"
            >
              <Message
                severity="info"
                text={companyInfoText}
                className="mb-3 ml-5"
              />
             <CompanyCertificates  />
            </TabPanel>
            <TabPanel
              header={
                <span className="tab-header">
                  <i className="pi pi-box"></i>
                  <span>Assets</span>
                </span>
              }
              className="spaced-tab-panel"
            >
              <Message
                severity="info"
                text={assetInfoText}
                className="mb-3 ml-5"
              />
            <AssetsTab
           
            assetIfricId={assetIfricId}
             />
            </TabPanel>
          </TabView>
        </div>
		 </div>
     </div>
	
  )
}

export default Certificates