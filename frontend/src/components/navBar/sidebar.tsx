import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";
import "../../styles/sidebar.css";
import { Tooltip } from 'primereact/tooltip';

interface SideBarProps {
  isOpen?: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
}

const Sidebar: React.FC<SideBarProps> = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  return (
    <section className="sidebar">
      {isOpen ? (
        <>
          <div className="logo-container flex gap-3">
            <img
              src="/ifric-org_horizontal.jpg"
              alt="ifric-org-logo"
              className="ifric-org-logo-icon"
              onClick={() => router.push("/factory-site/dashboard")}
            />
            <img
              src="/sidebar-icon.jpg"
              alt="sidebar-icon"
              onClick={() => setIsOpen(!isOpen)}
              style={{ cursor: "pointer" }}
            />
          </div>
          <div className="sidebar-dashboard-item">
            <div
              className="flex align-items-center sidebar-dashboard-text "
              onClick={() => router.push("/factory-site/factory-overview")}
            >
              <i className="pi pi-building mr-2" style={{ fontSize: '1.2rem' }} />
              <p className="m-0">Factory Sites</p>
            </div>
            <div className="flex align-items-center sidebar-dashboard-text"
               onClick={() => router.push("/asset-management")}>
              <i className="pi pi-box mr-2" style={{ fontSize: '1.2rem' }} />
              <p className="m-0">Factory assets</p>
            </div>
            <div className="flex align-items-center sidebar-dashboard-text "
              onClick={() => router.push("/certificates")}
            >
              <i className="pi pi-verified mr-2" style={{ fontSize: '1.2rem' }} />
              <p className="m-0">Certificate Manager </p>
            </div>
            <div className="flex align-items-center sidebar-dashboard-text "
              // onClick={() => router.push("/contracts")}
            >
               <i className="pi pi-file-edit mr-2" style={{ fontSize: '1.2rem' }} />
              <p className="m-0">Contract Manager </p>
            </div>
          </div>
          <div>
            <div className="pass-quota-container ">
              <h3 className="m-0">Product  Quota</h3>
              <img
                src="/usage-bar.jpg"
                alt="progress-bar"
                className="progress-bar"
              />
              <p className="progress-value m-0">Quota remaining: 9,159</p>
              <p className="progress-value m-0">Total quota: 10,000</p>
              <p className="upgrade-text">Upgrade Plan</p>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="flex">
            <img
              src="/ifric-org_horizontal-RGB.png"
              alt="ifric-org_horizontal-icon"
              className="ifric-org-logo-icon"
              onClick={() => router.push("/factory-site/dashboard")}
            />
          </div>
          <div className="collapse-sidebar-menu">
            <div
              className=" mb-6 sidebar-icon-container"
              onClick={() => setIsOpen(!isOpen)}
            >
              <img
                className="sidebar-collpase-icon p-1"
                src="/dashboard-collapse/sidebar-right.svg"
                alt="menu-item-icon"
                width="100%"
                height="100%"
              />
            </div>
            <div className="dashboard-menu sidebar-items">
              <i 
                className="pi pi-building"
                onClick={() => router.push("/factory-site/factory-overview")}
                style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                data-pr-tooltip="Factory Site"
                data-pr-position="right"
              />
              <i 
                className="pi pi-box"
                onClick={() => router.push("/asset-management")}
                style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                data-pr-tooltip="Factory Assets"
                data-pr-position="right"
              />
              <i 
                className="pi pi-verified"
                onClick={() => router.push("/certificates")}
                style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                data-pr-tooltip="Certificate Manager"
                data-pr-position="right"
              />
                <i 
                className="pi pi-file-edit "
                // onClick={() => router.push("/certificates")}
                style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                data-pr-tooltip="Contract Manager"
                data-pr-position="right"
              />
            </div>
          </div>
          <Tooltip target=".sidebar-items > i" />
          <div></div>
        </div>
      )}
    </section>
  );
};
export default Sidebar;
