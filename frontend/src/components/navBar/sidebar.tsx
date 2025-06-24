import { useRouter } from "next/router";
import { useState } from "react";
import "../../styles/sidebar.css";
import Image from "next/image";
import { Button } from "primereact/button";

function Sidebar() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);


  function handleSidebarClose() {
    setSidebarOpen(false);
  }
  function handleSidebarOpen() {
    if (sidebarOpen === false) {
      setSidebarOpen(true);
    } else {
      return;
    }
  }
  function handleRoute(value: string) {
    router.push(`/${value}`);
  }
  return (
    <div
      className={`sidebar_wrapper ${!sidebarOpen ? "collapse" : ""}`}
      //onClick={handleSidebarOpen}
      //onMouseEnter={handleSidebarOpen}
    >
      <div className="sidebar_header">
        <div className={`sidebar_logo_wrapper ${!sidebarOpen ? "collapse" : ""}`}>
          <Image
            src="/sidebar/logo_expanded.svg"
            alt="Factory logo"
            width={205}
            height={38}
            onClick={() => handleRoute("factory-site/factory-overview")}
            style={{ cursor: "pointer" }}
          ></Image>
          <Image
            src="/sidebar/sidebar_collapse_icon.svg"
            width={14}
            height={14}
            alt="collapse_icon"
            onClick={handleSidebarClose}
            className="sidebar_close"
          ></Image>
        </div>
        {!sidebarOpen && (
          <Image
            src="/sidebar/sidebar_expand_icon.svg"
            width={14}
            height={14}
            alt="expand_icon"
            onClick={handleSidebarOpen}
            className="sidebar_open"
          ></Image>
        )}
      </div>
      <div className="sidebar_content">
        <div className="sidebar_link_wrapper">
          <div className="sidebar_links">
            
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/factory-site/dashboard" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("factory-site/dashboard")}
            tooltip={!sidebarOpen ? "Dashboard" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/home_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Data Viewer
            </div>
          </Button>
           <Button
            className={`sidebar_navlink ${
              router.pathname === "asset-management" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("asset-management")}
            tooltip={!sidebarOpen ? "Factory Assets" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/assets_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Assets
            </div>
          </Button>
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/factory-site/factory-overview" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("factory-site/factory-overview")}
            tooltip={!sidebarOpen ? "Factory Sites" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/factory_sites.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Factory Sites
            </div>
          </Button>
         
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/certificates" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("certificates")}
            tooltip={!sidebarOpen ? "Certificate Manager" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/certificates_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Certificate Manager
            </div>
          </Button>
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/contract-manager" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("contract-manager")}
            tooltip={!sidebarOpen ? "Contract Manager" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/contract_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Contract Manager
            </div>
          </Button>
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/binding-manager" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("binding-manager")}
            tooltip={!sidebarOpen ? "Binding Manager" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/contract_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Binding Manager
            </div>
          </Button>
          <Button
            className={`sidebar_navlink ${
              router.pathname === "/binding-request" ? "is_active" : ""
            }`}
            onClick={() => handleRoute("binding-request")}
            tooltip={!sidebarOpen ? "Binding Request" : undefined}
            tooltipOptions={{ position: "right", event: "both" }}
          >
            <Image
              src="/sidebar/contract_icon.svg"
              width={18}
              height={18}
              alt="dashboard_icon"
            />
            <div
              className={`sidebar_navlink_text ${
                !sidebarOpen ? "sidebar_collapse_fade" : ""
              }`}
            >
              Binding Request
            </div>
          </Button>
          </div>
          {sidebarOpen && (
            <div className="pass_quota_container">
              <h3>Product Pass Quota</h3>

              <div className="progress_bar_container">
                <div
                  className="progress_bar_fill"
                  style={{
                    width: `50%`,
                  }}
                ></div>
              </div>
              <p className="progress_value">
                Quota remaining:{" "}
                9159
              </p>
              <p className="progress_value" style={{marginTop: "4px"}}>Total quota: 10,000</p>

              <br />
              
    

              <Button disabled className="upgrade_text" style={{color: "#333333"}}>
                Upgrade Plan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Sidebar;
