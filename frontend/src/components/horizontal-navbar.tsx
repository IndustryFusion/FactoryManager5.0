import React, { useEffect } from "react";
import { Button } from "primereact/button";
import { ColorPicker } from "primereact/colorpicker";
import { useState } from "react";
import { CSSProperties } from "react";
import { useRouter } from "next/router";
import Cookies from 'js-cookie';
import Alerts from "./alert/alerts";
import { LuLayoutDashboard } from "react-icons/lu";
import AssetManagementDialog from "./asset-management";


const HorizontalNavbar: React.FC = () => {
  const router = useRouter();
  const [assetManage, setAssetManage] = useState(false);

  const navbarStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 3.4rem 0px",
    backgroundColor: "white",
    zIndex: 1000,
    borderBottom: "solid",
    borderBottomWidth: "1px",
    borderRadius: "5px",
    borderColor: "#A9A9A9",

  };

  const logoStyle: CSSProperties = {
    height: "53px",
    width: "9rem",
    marginRight: "1rem",
    paddingBottom: "1rem" // Spacing after the logo
  };

  const navigateToIndustryFusion = () => {
    router.push("https://industry-fusion.org/de");
  };

  const logout = () => {
    Cookies.set("login_flag", "false");
    router.push("/login");
  };


  return (
    <div style={navbarStyle}>
      <div className="flex align-items-center logo-container cursor-pointer"
        onClick={() => router.push("/factory-site/factory-overview")}
      >
        <img src="/industryFusion_icon-removebg-preview.png" alt="Logo" style={logoStyle} />
      </div>
      <div className="flex  justify-content-between align-items-center" >
        <Button label="About Us" link onClick={navigateToIndustryFusion}
          className="mr-2" style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }} />
        <Button label="Contact Us" link
          className="mr-2" style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }} />
        <Button
          style={{ color: "#000", backgroundColor: "transparent", border: "none" }}
          tooltip="Asset Management"
          tooltipOptions={{ position: 'bottom' }}
          onClick={()=>setAssetManage(true)}
        ><img src="/assetManage.png"
          width="22px"
          height="22px"
          alt="asset_manage_icon" />        
          </Button>
        <Button
          style={{ color: "#000", backgroundColor: "transparent", border: "none" }}
          tooltip="Dashboard"
          onClick={() => router.push("/factory-site/dashboard")}
          tooltipOptions={{ position: 'bottom' }}
        ><LuLayoutDashboard /></Button>
        <Alerts />
        <Button icon="pi pi-user" link
          className="mr-2 " style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }} tooltip="Profile Details"
          tooltipOptions={{ position: 'bottom' }} />
        <Button onClick={logout} icon="pi pi-sign-out" link
          className="mr-2" style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }} tooltip="logout" tooltipOptions={{ position: 'bottom' }} />
          {assetManage && <AssetManagementDialog
          assetManageDialogProp={assetManage}
          setAssetManageDialogProp={setAssetManage}
          />}
      </div>
    </div>
  );
};

export default HorizontalNavbar;
