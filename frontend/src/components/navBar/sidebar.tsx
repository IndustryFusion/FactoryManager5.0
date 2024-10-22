import { useRouter } from "next/router";
import { Dispatch, SetStateAction, useState } from "react";
import "../../styles/sidebar.css";
import { Tooltip } from 'primereact/tooltip';
import Image from "next/image";
import { Button } from "primereact/button";

// const Sidebar: React.FC<SideBarProps> = ({ isOpen, setIsOpen }) => {
//   const router = useRouter();
//   return (
//     <section className="sidebar">
//       {isOpen ? (
//         <>
//           <div className="logo-container flex gap-3">
//             <img
//               src="/ifric-org_horizontal.jpg"
//               alt="ifric-org-logo"
//               className="ifric-org-logo-icon"
//               onClick={() => router.push("/factory-site/dashboard")}
//             />
//             <img
//               src="/sidebar-icon.jpg"
//               alt="sidebar-icon"
//               onClick={() => setIsOpen(!isOpen)}
//               style={{ cursor: "pointer" }}
//             />
//           </div>
//           <div className="sidebar-dashboard-item">
//             <div
//               className="flex align-items-center sidebar-dashboard-text "
//               onClick={() => router.push("/factory-site/factory-overview")}
//             >
//               <i className="pi pi-building mr-2" style={{ fontSize: '1.2rem' }} />
//               <p className="m-0">Factory Sites</p>
//             </div>
//             <div className="flex align-items-center sidebar-dashboard-text"
//                onClick={() => router.push("/asset-management")}>
//               <i className="pi pi-box mr-2" style={{ fontSize: '1.2rem' }} />
//               <p className="m-0">Factory Assets</p>
//             </div>
//             <div className="flex align-items-center sidebar-dashboard-text "
//               onClick={() => router.push("/certificates")}
//             >
//               <i className="pi pi-verified mr-2" style={{ fontSize: '1.2rem' }} />
//               <p className="m-0">Certificate Manager </p>
//             </div>
//             <div className="flex align-items-center sidebar-dashboard-text "
//               // onClick={() => router.push("/contracts")}
//             >
//                <i className="pi pi-file-edit mr-2" style={{ fontSize: '1.2rem' }} />
//               <p className="m-0">Contract Manager </p>
//             </div>
//           </div>
//           <div>
//             <div className="pass-quota-container ">
//               <h3 className="m-0">Product  Quota</h3>
//               <img
//                 src="/usage-bar.jpg"
//                 alt="progress-bar"
//                 className="progress-bar"
//               />
//               <p className="progress-value m-0">Quota remaining: 9,159</p>
//               <p className="progress-value m-0">Total quota: 10,000</p>
//               <p className="upgrade-text">Upgrade Plan</p>
//             </div>
//           </div>
//         </>
//       ) : (
//         <div>
//           <div className="flex">
//             <img
//               src="/ifric-org_horizontal-RGB.png"
//               alt="ifric-org_horizontal-icon"
//               className="ifric-org-logo-icon"
//               onClick={() => router.push("/factory-site/dashboard")}
//             />
//           </div>
//           <div className="collapse-sidebar-menu">
//             <div
//               className=" mb-6 sidebar-icon-container"
//               onClick={() => setIsOpen(!isOpen)}
//             >
//               <img
//                 className="sidebar-collpase-icon p-1"
//                 src="/dashboard-collapse/sidebar-right.svg"
//                 alt="menu-item-icon"
//                 width="100%"
//                 height="100%"
//               />
//             </div>
//             <div className="dashboard-menu sidebar-items">
//               <i 
//                 className="pi pi-building"
//                 onClick={() => router.push("/factory-site/factory-overview")}
//                 style={{ fontSize: '1.5rem', cursor: 'pointer' }}
//                 data-pr-tooltip="Factory Site"
//                 data-pr-position="right"
//               />
//               <i 
//                 className="pi pi-box"
//                 onClick={() => router.push("/asset-management")}
//                 style={{ fontSize: '1.5rem', cursor: 'pointer' }}
//                 data-pr-tooltip="Factory Assets"
//                 data-pr-position="right"
//               />
//               <i 
//                 className="pi pi-verified"
//                 onClick={() => router.push("/certificates")}
//                 style={{ fontSize: '1.5rem', cursor: 'pointer' }}
//                 data-pr-tooltip="Certificate Manager"
//                 data-pr-position="right"
//               />
//                 <i 
//                 className="pi pi-file-edit "
//                 // onClick={() => router.push("/certificates")}
//                 style={{ fontSize: '1.5rem', cursor: 'pointer' }}
//                 data-pr-tooltip="Contract Manager"
//                 data-pr-position="right"
//               />
//             </div>
//           </div>
//           <Tooltip target=".sidebar-items > i" />
//           <div></div>
//         </div>
//       )}
//     </section>
//   );
// };
// export default Sidebar;
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
            alt="IFRIC logo"
            width={200}
            height={45}
            onClick={() => handleRoute("dashboard")}
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
              Dashboard
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
            <div className="flex align-items-center sidebar-dashboard-text "
              // onClick={() => router.push("/contracts")}
            >
               <i className="pi pi-file-edit mr-2" style={{ fontSize: '1.2rem' }} />
              <p className="m-0">Contract Manager </p>
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
