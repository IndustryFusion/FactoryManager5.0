import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import "../../styles/sidebar.css";
import Image from "next/image";
import { Button } from "primereact/button";
import { getAccessGroup } from "@/utility/indexed-db";
import { generateToken, getCompanyDetailsById, getUserDetails } from "@/utility/auth";
import { showToast } from "@/utility/toast";
import { Toast } from "primereact/toast";
import axios from "axios"; // You need this for error handling
import { Coming_Soon } from "next/font/google";

const xana_url = process.env.NEXT_PUBLIC_XANA_URL || "https://dev-xana.industryfusion-x.org";

function Sidebar() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contractMenuOpen, setContractMenuOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [companyName, setCompanyName] = useState("Company");
  const [companyId, setCompanyId] = useState("ID");
  const toast = useRef<Toast>(null);
  const [userImage, setUserImage] = useState("/avatar.svg");
  const [laoding, setLoading] = useState(false)

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await getAccessGroup();
        if (!data) {
          showToast(toast, "error", "Error", "No user data found");
          return;
        }
        const fullName = data.user_name || "User";
        setUserName(fullName);
        setCompanyId(data.company_ifric_id || "ID");
        const companyDetails = await getCompanyDetailsById(data.company_ifric_id || "ID");
        const userDetails = await getUserDetails({
          user_email: data.user_email,
          company_ifric_id: data.company_ifric_id
        })
        const name = companyDetails?.data?.[0]?.company_name;
        const userImage = userDetails?.data?.[0]?.user_image;
        if (userImage) {
          setUserImage(userImage);
        } else {
          setUserImage("/avatar.svg");
        }
        if (name) setCompanyName(name);
      } catch (error: unknown) {
        setLoading(false);
        if (axios.isAxiosError(error) && error.response?.data?.message) {
          showToast(toast, "error", "Error", error.response.data.message);
        } else {
          showToast(toast, "error", "Error", "Error fetching user data");
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  function handleSidebarClose() {
    setSidebarOpen(false);
  }

  function handleSidebarOpen() {
    if (!sidebarOpen) setSidebarOpen(true);
  }

  function handleRoute(value: string) {
    if (value.startsWith("http")) {
      window.open(value, "_self");
    } else {
      router.push(`/${value}`);
    }
  }

  async function handleXanaRoute() {
    const token = await getAccessGroup();
    const response = await generateToken({ token: token.jwt_token });
    if (response && response.data) {
      const token2 = response.data.token;
      window.open(`${xana_url}?token=${token2}`, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className={`sidebar_wrapper ${!sidebarOpen ? "collapse" : ""}`}>
      <div className="sidebar_header">
        <div className={`sidebar_logo_wrapper ${!sidebarOpen ? "collapse" : ""}`}>
          <Image
            src="/sidebar/logo_expanded.svg"
            alt="Factory logo"
            width={188}
            height={45}
            onClick={() => handleRoute("factory-site/factory-overview")}
            style={{ cursor: "pointer" }}
            className="sidebar_logo"
          />
          <Image
            src="/sidebar/sidebar_collapse_icon.svg"
            width={14}
            height={14}
            alt="collapse_icon"
            onClick={handleSidebarClose}
            className="sidebar_close"
          />
        </div>
        {!sidebarOpen && (
          <Image
            src="/sidebar/sidebar_expand_icon.svg"
            width={14}
            height={14}
            alt="expand_icon"
            onClick={handleSidebarOpen}
            className="sidebar_open"
          />
        )}
      </div>

      <div className="sidebar_content">
        <div className="sidebar_link_wrapper">
          <div className="sidebar_links">
            <Button
              className={`sidebar_navlink ${router.pathname === "/dashboard" ? "is_active" : ""}`}
              onClick={() => handleRoute("dashboard")}
              tooltip={!sidebarOpen ? "Dashboard" : undefined}
              tooltipOptions={{ position: "right", event: "both" }}
            >
              <Image src="/dashboard-circle.svg" width={18} height={18} alt="dashboard_icon" />
              <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Dashboard</div>
            </Button>

            <div className={`link_group_title ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>My Factory</div>

            <Button
              className={`sidebar_navlink ${router.pathname === "/asset-management" ? "is_active" : ""}`}
              onClick={() => handleRoute("asset-management")}
              tooltip={!sidebarOpen ? "Factory Assets" : undefined}
              tooltipOptions={{ position: "right", event: "both" }}
            >
              <Image src="/3d-printer.svg" width={18} height={18} alt="asset_icon" />
              <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Assets</div>
            </Button>

            <div>
              <Button
                className={`sidebar_navlink ${router.pathname === "/" ? "is_active" : ""}`}
                onClick={() => { }}
                tooltip={!sidebarOpen ? "Production Lines" : "Coming soon"}
                tooltipOptions={{ position: "right", event: "both" }}
              >
                <Image src="/Component 1.svg" width={18} height={18} alt="line_icon" />
                <div className={`sidebar_navlink_text_cs ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>
                  Production Lines
                </div>
              </Button>
            </div>

            <Button
              className={`sidebar_navlink ${router.pathname === "/factory-site/factory-overview" ? "is_active" : ""}`}
              onClick={() => handleRoute("factory-site/factory-overview")}
              tooltip={!sidebarOpen ? "Factory Sites" : undefined}
              tooltipOptions={{ position: "right", event: "both" }}
            >
              <Image src="/warehouse.svg" width={18} height={18} alt="factory_icon" />
              <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Factory Sites</div>
            </Button>

            {/* <div className={`link_group_title ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Data Management</div>

            <Button
              className={`sidebar_navlink ${contractMenuOpen ? "is_active" : ""}`}
              onClick={() => setContractMenuOpen(!contractMenuOpen)}
              tooltip={!sidebarOpen ? "Contract Manager" : undefined}
              tooltipOptions={{ position: "right", event: "both" }}
            >
              <Image src="/sidebar/contract_icon.svg" width={18} height={18} alt="contract_icon" />
              <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Contract Manager</div>
              {sidebarOpen && <span className={`dropdown_arrow ${contractMenuOpen ? "flip" : ""}`}><img src="/arrow-down.svg" /></span>}
            </Button> */}

            {/* {contractMenuOpen && sidebarOpen && (
              <div className="contract-dropdown-container">
                <div className="contract-line" />
                <div className="contract-dropdown-items">
                  <div className="contract-dropdown-item">
                    <div className="connector-line" />
                    <Button
                      className="sidebar_sub_navlink"
                      onClick={() => handleRoute("https://dev-factory.industry-fusion.com/contract-manager")}
                    >
                      Contracts
                    </Button>
                  </div>
                  <div className="contract-dropdown-item">
                    <div className="connector-line" />
                    <Button
                      className="sidebar_sub_navlink"
                      onClick={() => handleRoute("https://dev-factory.industry-fusion.com/binding-manager")}
                    >
                      Active Agreements
                    </Button>
                  </div>
                  <div className="contract-dropdown-item">
                    <div className="connector-line" />
                    <Button
                      className="sidebar_sub_navlink"
                      onClick={() => handleRoute("https://dev-factory.industry-fusion.com/binding-request")}
                    >
                      Pending Agreements
                    </Button>
                  </div>
                </div>
              </div>
            )} */}

            <div className={`link_group_title ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Analytics</div>

            <Button
              className={`sidebar_navlink ${router.pathname === "/factory-site/dashboard" ? "is_active" : ""}`}
              onClick={() => handleRoute("factory-site/dashboard")}
              tooltip={!sidebarOpen ? "Data Viewer" : undefined}
              tooltipOptions={{ position: "right", event: "both" }}
            >
              <Image src="/sidebar/data_viewer_icon.svg" width={18} height={18} alt="data_icon" />
              <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>Data Viewer</div>
            </Button>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div>
                <Button
                  className={`sidebar_navlink ${router.pathname === "" ? "is_active" : ""}`}
                  onClick={() => { }}
                  tooltip={!sidebarOpen ? "Reports" : "Coming soon"}
                  tooltipOptions={{ position: "right", event: "both" }}
                >
                  <Image src="/reports-grey.svg" width={18} height={18} alt="report_icon" />
                  <div className={`sidebar_navlink_text_cs ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>
                    Reports
                  </div>
                </Button>
              </div>

              <div>
                <Button
                  className={`sidebar_navlink is_active`}
                  onClick={() => { handleXanaRoute() }}
                  tooltip={!sidebarOpen ? "Xana AI" : "Test Version"}
                  tooltipOptions={{ position: "right", event: "both" }}
                >
                  <Image src="/xana.svg" width={18} height={18} alt="xana_icon" />
                  <div className={`sidebar_navlink_text ${!sidebarOpen ? "sidebar_collapse_fade" : ""}`}>
                    Xana AI
                  </div>
                </Button>
              </div>
            </div>

          </div>
          <div className="sidebar_bottom_section">
            <div className="sidebar_profile_section">
              <img
                src={userImage}
                alt="user_avatar"
                width={36}
                height={36}
                className="sidebar_profile_avatar"
              />
              <div className="sidebar_profile_info">
                <div className="sidebar_profile_name">{companyName}</div>
                <div className="sidebar_profile_company">{userName}</div>
              </div>
              <img
                src="/arrow-down.svg"
                alt="dropdown_arrow"
                className="sidebar_profile_dropdown_icon"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
