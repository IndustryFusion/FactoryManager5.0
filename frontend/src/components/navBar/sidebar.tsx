import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";
import "../../styles/sidebar.css";

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
              className="flex align-items-center sidebar-dashboard-text"
              onClick={() => router.push("/factory-site/dashboard")}
            >
              <img
                src="/dashboard.jpg"
                alt="asset-series-icon"
                className="mr-2"
              />
              <p className="m-0">Dashboard</p>
            </div>
            <div className="flex align-items-center sidebar-dashboard-text">
              <img
                src="/ai-browser.jpg"
                alt="asset-series-icon"
                className="mr-2"
              />
              <p className="m-0">Overview</p>
            </div>
            <div className="flex align-items-center sidebar-dashboard-text">
              <img
                src="/ai-browser.jpg"
                alt="asset-series-icon"
                className="mr-2"
              />
              <p className="m-0">Factory Flow</p>
            </div>
          </div>

          <div>
            <div className="pass-quota-container mt-7">
              <h3 className="m-0">Product Pass Quota</h3>
              <img
                src="/usage-bar.jpg"
                alt="progress-bar"
                className="progress-bar"
              />
              <p className="progress-value m-0">Quota remaining: 9,159</p>
              <p className="progress-value m-0">Total quota: 10,000</p>

              <p className="upgrade-text">Upgrade Plan</p>
            </div>
            <div className="flex align-items-center item-container">
              <img src="/book.jpg" alt="docs-icon" className="mr-2" />
              <h3 className="item-heading">Helpcenter</h3>
            </div>
            <div className="flex align-items-center item-container">
              <img src="/settings.jpg" alt="settings-icon" className="mr-2" />
              <h3 className="item-heading">Settings</h3>
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
                className="sidebar-collpase-icon"
                src="/dashboard-collapse/sidebar-right.svg"
                alt="menu-item-icon"
                width="100%"
                height="100%"
              />
            </div>
            <div className="dashboard-menu sidebar-items">
              <img
                onClick={() => router.push("/factory-site/dashboard")}
                src="/dashboard-collapse/dashboard.svg"
                alt="menu-item-icon"
                width="100%"
                height="100%"
              />
              <img
                onClick={() => router.push("/dashboard")}
                src="/ai-browser.jpg"
                alt="menu-item-icon"
                width="100%"
                height="100%"
              />
              <img
                onClick={() => router.push("/dashboard")}
                src="/ai-browser.jpg"
                alt="menu-item-icon"
                width="100%"
                height="100%"
              />
            </div>
            <div className="flex flex-column gap-4 last-items ">
              <img
                src="/dashboard-collapse/book.svg"
                alt="docs-icon"
                className="mr-2"
              />
              <img
                src="/dashboard-collapse/settings.svg"
                alt="settings-icon"
                className="mr-2"
              />
            </div>
          </div>
          <div></div>
        </div>
      )}
    </section>
  );
};
export default Sidebar;
