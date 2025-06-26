import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";
import "../styles/dashboard-page.css";
import StackedPercentageBarChart from "@/components/dashboard/dashboard-charts";
import { getAccessGroup } from "@/utility/indexed-db";
import axios from "axios";
import { showToast } from "@/utility/toast";
import { Toast } from "primereact/toast"; // Update path if needed


const getGreetings = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};
export default function DashboardPage() {
    const [userName, setUserName] = useState("User");
    const toast = useRef<Toast>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getAccessGroup();
                if (!data) {
                    showToast(toast, "error", "Error", "No user data found");
                    return;
                }
                const fullName = data.user_name || "User";
                const firstName = fullName.trim().split(" ")[0];
                setUserName(firstName);
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.data?.message) {
                    showToast(toast, "error", "Error", error.response.data.message);
                } else {
                    showToast(toast, "error", "Error", "Error fetching user data");
                }
            }
        };

        fetchUserData();
    }, []);
 

    return (
        <div className="flex">
            <Sidebar />
            <div className="main_content_wrapper">
                <div className="navbar_wrapper">
                    <Navbar navHeader={"Dashboard"} />
                </div>
                <div className="dashboardpage-container">
                    <main>
                        <div className="header">
                            <div style={{ display: "flex", flexDirection: "column", padding: "16px" }}>
                                <div className="header-title-greet">{getGreetings()}, {userName} 👋</div>
                                <div className="header-subtitle">Factory Manager is your home-base for all your Machines and Assets</div>
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
                                    <div className="header-title">Eckelmann Group</div>
                                    <div className="header-subtitle">Wiesbaden, Germany</div>
                                </div>
                            </div>
                        </div>

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
                                    <li className="notification">
                                        CNC laser cutting machine is burning <span>12:21:34</span>
                                        <img src="/go-next.svg" alt="next" />
                                    </li>
                                    <li className="notification">
                                        Injection mold reached critical temperature <span>10:38:14</span>
                                        <img src="/go-next.svg" alt="next" />
                                    </li>
                                    <li className="notification">
                                        OEE of production line ‘Welding 1’ 24% lower <span>09:01:12</span>
                                        <img src="/go-next.svg" alt="next" />
                                    </li>
                                    <li className="notification-alert">
                                        OEE of production line ‘Cutting 2’ 11% lower <span>09:01:08</span>
                                        <img src="/go-next.svg" alt="next" />
                                    </li>
                                    <li className="notification-li">
                                        Finish setup of new Asset ‘Powdercoating Cabin’ <span>06:48:30</span>
                                        <img src="/go-next.svg" alt="next" />
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="small-card">
                            <div className="small-card-list">
                                <img src="/3d-printer.svg" className="img-smallcard" alt="Monitor Assets" />
                                <div className="small-card-name">Monitor Assets</div>
                            </div>
                            <div className="small-card-list">
                                <img src="/workflow-square.svg" className="img-smallcard" alt="Monitor Production Line" />
                                <div className="small-card-name">Monitor Production Line</div>
                            </div>
                            <div className="small-card-list">
                                <img src="/warehouse.svg" className="img-smallcard" alt="Manage Factory Sites" />
                                <div className="small-card-name">Manage Factory Sites</div>
                            </div>
                            <div className="small-card-list">
                                <img src="/analytics.svg" className="img-smallcard" alt="Get Reports" />
                                <div className="small-card-name">Get Reports</div>
                            </div>
                        </div>

                        <div className="xana-container">
                            <div className="xana-content">
                                <img src="/ai-magic.svg" width={60} height={60} alt="AI Magic Icon" />
                                <div>
                                    <h1 className="xana-heading">Ask Xana what's going on in your factory</h1>
                                    <p className="xana-subheading">What was the downtime of my Lasers last week?</p>
                                    <p className="xana-subheading-section">
                                        The core component for running IndustryFusion-X on your machines. Includes <br />
                                        essential services for robust operation and data management
                                    </p>
                                </div>
                            </div>
                            <div>
                                <button className="xana-button">Ask Xana now</button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
function useToast() {
    throw new Error("Function not implemented.");
}

