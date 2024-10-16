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

import React, { useEffect } from "react";
import { Button } from "primereact/button";
import { ColorPicker } from "primereact/colorpicker";
import { useState } from "react";
import { CSSProperties } from "react";
import { useRouter } from "next/router";
import Alerts from "../alert/alerts";
import { LuLayoutDashboard } from "react-icons/lu";
import AssetManagementDialog from "../assetManagement/asset-management";
import ProfileDialog from "./profile-dialog";
import { useDispatch } from "react-redux";
import { resetTimer, logout } from "@/redux/auth/authSlice";
import { useTranslation } from "next-i18next";
import Language from "./language";
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import '@/styles/navbar.css'

const HorizontalNavbar: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation('header');
  const [assetManage, setAssetManage] = useState(false);
  const [profileDetail, setProfileDetail] = useState(false);
  const dispatch = useDispatch();

  const navbarStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 3.4rem 0px 1.6rem",
    backgroundColor: "#fff",
    zIndex: 1000,
    borderBottom: "solid",
    borderBottomWidth: "1px",
    borderRadius: "5px",
    borderColor: "#A9A9A9",
  };

  const logoStyle: CSSProperties = {
    width: "45px",
    padding: "0.5rem 0"
  }

  const logoText: CSSProperties = {
    fontWeight: "600",
    color: "#615E5E",
    fontFamily: "Inter",
    fontSize: "21px"
  }
 
  const navigateToIndustryFusion = () => {
    router.push("https://industry-fusion.org/de");
  };

  const handleLogout = () => {
    router.push("/login", undefined, {locale: 'en'});
    dispatch(resetTimer());
    dispatch(logout());
  };


  return (
      <div className="flex  justify-content-between align-items-center" >
        <div className="mr-3 language-dropdown">
          <Language />
        </div>
        <Button icon="pi pi-warehouse" link
          style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
          tooltip="Asset Management"
          tooltipOptions={{ position: 'bottom' }}
          onClick={() => setAssetManage(true)}
        />
        <Button icon="pi pi-objects-column" link
          style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
          tooltip="Dashboard"
          tooltipOptions={{ position: 'bottom' }}
          onClick={() => router.push("/factory-site/dashboard")}
        />
        <Alerts />
        <Button  link
            style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
            tooltip="Profile Details"
            tooltipOptions={{ position: 'bottom' }}
          
        >
         <img
            src="/profile-icon.jpg"
            alt="profile-icon"
            onClick={() => setProfileDetail(true)}
          />
          </Button>
        {/* <Button onClick={handleLogout} icon="pi pi-sign-out" link
          style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
          tooltip="logout" tooltipOptions={{ position: 'bottom' }} /> */}
        {assetManage && <AssetManagementDialog
          assetManageDialogProp={assetManage}
          setAssetManageDialogProp={setAssetManage}
        />}
        {profileDetail && <ProfileDialog
          profileDetailProp={profileDetail}
          setProfileDetailProp={setProfileDetail}
        />}
      </div>
  );
};

export default HorizontalNavbar;
