import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";
import "../styles/dashboard-page.css";
import StackedPercentageBarChart from "@/components/dashboard/dashboard-charts";
import { getAccessGroup } from "@/utility/indexed-db";
import { getCompanyDetailsById } from "@/utility/auth";
import axios from "axios";
import { showToast } from "@/utility/toast";
import { Toast } from "primereact/toast";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

const getGreetings = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

interface CompanyDetails {
    data?: Array<{
        company_name?: string;
    }>;
}

interface AccessGroupData {
    user_name?: string;
    company_ifric_id?: string;
}

const DashboardPage: React.FC = () => {
    const [userName, setUserName] = useState<string>("User");
    const [companyName, setCompanyName] = useState<string>("Company");
    const [companyId, setCompanyId] = useState<string>("ID");
    const toast = useRef<Toast>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async (): Promise<void> => {
            try {
                const data: AccessGroupData | undefined = await getAccessGroup();
                if (!data) {
                    showToast(toast, "error", "Error", "No user data found");
                    return;
                }

                const fullName: string = data.user_name || "User";
                const firstName: string = fullName.trim().split(" ")[0];
                setUserName(firstName);
                setCompanyId(data.company_ifric_id || "ID");

                const companyDetails: CompanyDetails | undefined = await getCompanyDetailsById(data.company_ifric_id || "ID");
                const name: string | undefined = companyDetails?.data?.[0]?.company_name;
                if (name) setCompanyName(name);
            } catch (error: unknown) {
                if (axios.isAxiosError(error) && error.response?.data?.message) {
                    showToast(toast, "error", "Error", error.response.data.message);
                } else {
                    showToast(toast, "error", "Error", "Error fetching user data");
                }
            }
        };

        fetchUserData();
    }, []);

    const truncateCompanyId = (id: string): string => {
        if (!id || id.length < 20) return id;
        const prefix = id.slice(0, 13);   // "urn:ifric:ifx-"
        const suffix = id.slice(-8);      // last 8 characters
        return `${prefix}...............${suffix}`;
    };

    return (
        <div className="flex">
            <Sidebar />
            <div className="main_content_wrapper">
                {/* ✅ Toast must be rendered in JSX */}
                <Toast ref={toast} />

                <div className="navbar_wrapper">
                    <Navbar
                        navHeader={
                            <div style={{ lineHeight: "1.2" }}>
                                <div style={{ fontWeight: 600 }}>{companyName}</div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "rgb(108, 117, 125)",
                                        alignItems: "center",
                                        display: "flex",
                                        gap: "4px",
                                    }}
                                >
                                    <img src="/id.svg" alt="ID icon" />
                                    {truncateCompanyId(companyId)}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(companyId);
                                            showToast(toast, "success", "Copied", "Company ID copied to clipboard");
                                        }}
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            padding: 0,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                        title="Copy ID"
                                    >
                                        <img src="/copy-01.svg" alt="Copy" />
                                    </button>
                                </div>
                            </div>
                        }
                    />
                </div>

                <div className="dashboardpage-container">
                    <main>
                        <div className="header">
                            <div style={{ display: "flex", flexDirection: "column", padding: "16px" }}>
                                <div className="header-title-greet">
                                    {getGreetings()}, {userName} 👋
                                </div>
                                <div className="header-subtitle-greet">
                                    Factory Manager is your home-base for all your Machines and Assets
                                </div>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "24px",
                                    borderRadius: 16,
                                    background: "var(--Secondary-Grey, #F7F8FA)",
                                    padding: "16px",
                                }}
                            >
                                <img src="/Ellipse 5947.svg" alt="User avatar" width={51} height={51} />
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div className="header-title">{companyName}</div>
                                    <div className="header-subtitle">Wiesbaden, Germany</div>
                                </div>
                            </div>
                        </div>

                        {/* Rest of the dashboard UI */}
                        <div className="dashboard-content-grid">
                            <div className="bar-chart-card">
                                <div className="card-header">
                                    <span className="card-title">Asset Activity</span>
                                    <div className="tab-buttons">
                                        <button className="tab-button active">10-Day</button>
                                        <button className="tab-button">Intra-Day</button>
                                    </div>
                                </div>
                                <StackedPercentageBarChart />
                            </div>

                            <div className="notification-card">
                                <div className="card-header">
                                    <span className="card-title">Today's Notifications</span>
                                    <a href="#" className="view-all">View all Notifications →</a>
                                </div>
                                <ul className="notification-list">
                                    {/* Notification Items */}
                                    <li className="notification-item">
                                        <div className="notification-left">
                                            <img src="/dot-blue.svg" alt="status" className="dot" />
                                            <span className="notification-text">‘Laser Cutter 1’ error</span>
                                        </div>
                                        <span className="notification-time">12:21:34</span>
                                    </li>
                                    <li className="notification-item">
                                        <div className="notification-left">
                                            <img src="/dot-blue.svg" alt="status" className="dot" />
                                            <span className="notification-text">Injection mold reached critical temperature</span>
                                        </div>
                                        <span className="notification-time">10:38:14</span>
                                    </li>
                                    <li className="notification-item">
                                        <div className="notification-left">
                                            <img src="/dot-blue.svg" alt="status" className="dot" />
                                            <span className="notification-text">OEE of production line ‘Welding 1’ 24% lower</span>
                                        </div>
                                        <span className="notification-time">09:01:12</span>
                                    </li>
                                    <li className="notification-item notification-alert">
                                        <div className="notification-left">
                                            <img src="/grey-dot.svg" alt="status" className="dot" />
                                            <span className="notification-text-blue">OEE of production line ‘Cutting 2’ 11% lower</span>
                                        </div>
                                        <span className="notification-time">09:01:08</span>
                                    </li>
                                    <li className="notification-item notification-li">
                                        <div className="notification-left">
                                            <img src="/grey-dot.svg" alt="status" className="dot" />
                                            <span className="notification-text-gray">Finish setup of new Asset ‘Powdercoating Cabin’</span>
                                        </div>
                                        <span className="notification-time">06:48:30</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Small Cards */}
                        <div className="small-card">
                            <div
                                className="small-card-list"
                                onClick={() => router.push("/asset-management")}
                                style={{ cursor: "pointer" }}
                            >
                                <img src="/3d-printer-icon.svg" className="img-smallcard" alt="Monitor Assets" />
                                <div className="small-card-section">
                                    <div className="small-card-title">Monitor</div>
                                    <div className="small-card-name">Assets</div>
                                </div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/production-lines")}
                                style={{ cursor: "pointer" }}
                            >
                                <img src="/workspace.svg" className="img-smallcard" alt="Monitor Production Line" />
                                <div className="small-card-section">
                                    <div className="small-card-title">Monitor</div>
                                    <div className="small-card-name">Production Lines</div>
                                </div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/factory-site/factory-overview")}
                                style={{ padding: "0px", cursor: "pointer" }}
                            >
                                <img src="/factory-site-map.svg" alt="Manage Factory Sites" style={{ maxWidth: "100%" }} />
                                <div className="small-card-name" style={{ paddingLeft: "10px" }}>Factory Sites</div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/reports")}
                                style={{ cursor: "pointer" }}
                            >
                                <img src="/analytics-icon.svg" className="img-smallcard" alt="Get Reports" />
                                <div className="small-card-section">
                                    <div className="small-card-title">View</div>
                                    <div className="small-card-name">Reports</div>
                                </div>
                            </div>
                        </div>


                        {/* Xana Section */}
                        <div className="xana-container">
                            <div className="xana-content">
                                <img src="/ai-magic.svg" width={60} height={60} alt="AI Magic Icon" />
                                <div>
                                    <h1 className="xana-heading">What’s going on in your factory? Ask Xana.</h1>
                                    <p className="xana-subheading">Your intelligent assistant for smarter decisions.</p>
                                    <p className="xana-subheading-section">
                                        Why is my cutting line underperforming?, How can I reduce idle time on Station 4?
                                        <br /> Xana helps you get answers – and act on them.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <button className="xana-button"><span><img src="/ai-audio.svg" /></span>Ask Xana AI</button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};
export async function getStaticProps({ locale }: { locale: string }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, [
                'header',
                'overview',
                'placeholder',
                'dashboard',
                'button'
            ])),
        },
    }
}
export default DashboardPage;