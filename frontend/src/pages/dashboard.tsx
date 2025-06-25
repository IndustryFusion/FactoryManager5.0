import React from "react";
import { Chart } from "primereact/chart";
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";
import "../styles/dashboard-page.css";

export default function DashboardPage() {
    const barData = {
        labels: ["17.05", "18.05", "19.05", "20.05", "21.05", "22.05", "23.05", "24.05", "25.05", "26.05"],
        datasets: [
            {
                label: "Running",
                backgroundColor: "#46a0fc",
                data: [3.26, 4.5, 3.9, 4.1, 4.6, 3.8, 4.2, 4.3, 4.0, 4.5]
            },
            {
                label: "Idle",
                backgroundColor: "#fdd835",
                data: [0.4, 0.5, 0.3, 0.2, 0.4, 0.3, 0.5, 0.4, 0.4, 0.3]
            },
            {
                label: "Maintenance",
                backgroundColor: "#ffb300",
                data: [1.41, 1.2, 1.3, 1.1, 1.5, 1.4, 1.3, 1.2, 1.2, 1.3]
            },
            {
                label: "Error",
                backgroundColor: "#ef5350",
                data: [1.15, 0.8, 1.1, 0.9, 1.0, 0.95, 1.1, 1.05, 0.9, 1.0]
            },
            {
                label: "Offline",
                backgroundColor: "#9e9e9e",
                data: [3.26, 3.5, 3.8, 3.9, 3.6, 3.7, 3.8, 3.9, 3.7, 3.8]
            }
        ]
    };

    const barOptions = {
        plugins: {
            legend: {
                position: "bottom"
            }
        },
        responsive: true,
        maintainAspectRatio: false
    };

    return (
        <div className="flex">
            <Sidebar />
            <div className="main_content_wrapper">
                <div className="navbar_wrapper">
                    <Navbar navHeader={"Dashboard"} />
                </div>
                <div className="dashboardpage-container">
                    <main className="col-span-4">
                        <div className="header">
                            <div>
                                <div className="header-title">Good afternoon, Frederick 👋</div>
                                <div className="header-subtitle">Factory Manager is your home-base for all your Machines and Assets</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "24px" }}>
                                <img src="/Ellipse 5947.svg" alt="User avatar" />
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
                                <Chart type="bar" data={barData} options={barOptions} className="barchart" />
                            </div>

                            <div className="notification-card">
                                <div className="card-header">
                                    <span className="card-title">Todays Notifications</span>
                                    <a href="#" className="view-all">View all Notifications →</a>
                                </div>
                                <div className="notification-badge">16</div>
                                <ul className="notification-list">
                                    <li className="notification error">• ‘Laser Cutter 1’ error <span>12:21:34</span></li>
                                    <li className="notification alert">• Injection mold reached critical temperature <span>10:38:14</span></li>
                                    <li className="notification highlight">• OEE of production line ‘Welding 1’ 24% lower <span>09:01:12</span></li>
                                    <li className="notification highlight">• OEE of production line ‘Cutting 2’ 11% lower <span>09:01:08</span></li>
                                    <li className="notification muted">Finish setup of new Asset ‘Powdercoating Cabin’ <span>06:48:30</span></li>
                                </ul>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
