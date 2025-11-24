import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/navBar/sidebar";
import Navbar from "@/components/navBar/navbar";
import "../styles/dashboard-page.css";
import StackedPercentageBarChart from "@/components/dashboard/dashboard-charts";
import { getAccessGroup } from "@/utility/indexed-db";
import { generateToken, getCompanyDetailsById, getUserDetails } from "@/utility/auth";
import axios from "axios";
import { showToast } from "@/utility/toast";
import { Toast } from "primereact/toast";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";

interface CompanyDetails {
    data?: Array<{
        company_name?: string;
        address_1?:string;
        country?:string
    }>;
}

interface AccessGroupData {
    user_name?: string;
    company_ifric_id?: string;
}

const xana_url = process.env.NEXT_PUBLIC_XANA_URL || "https://dev-xana.industryfusion-x.org";

const DashboardPage: React.FC = () => {
    const [userName, setUserName] = useState<string>("User");
    const [companyName, setCompanyName] = useState<string>("Company");
    const [companyId, setCompanyId] = useState<string>("ID");
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const [address, setAddress] = useState("")
    const [country, setCountry] = useState("")
    const [userImage, setUserImage] = useState("")
    const avatarLetter =  (userName ?? "").trim().charAt(0).toUpperCase() || "";
    const [activityInterval, setActivityInterval] = useState<string>("10-days");

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
                setUserImage(companyDetails?.data[0]?.company_image)
                setAddress(companyDetails?.data[0]?.city);
                setCountry(companyDetails?.data[0]?.country);
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

    const {t} = useTranslation("dashboard");

    const getGreetings = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("good_morning");
    if (hour < 18) return t("good_afternoon");
    return t("good_evening");
};

    const truncateCompanyId = (id: string): string => {
        if (!id || id.length < 20) return id;
        const prefix = id.slice(0, 13);   // "urn:ifric:ifx-"
        const suffix = id.slice(-8);      // last 8 characters
        return `${prefix}...............${suffix}`;
    };

    async function handleXanaOpen() {
        const token = await getAccessGroup();
        const response = await generateToken({ token: token.ifricdi });
        if (response && response.data) {
            const token2 = response.data.token;
            window.open(`${xana_url}?token=${token2}`, '_blank', 'noopener,noreferrer');
        }
    }

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
                                {t("dashboard_subheader")}
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
                            {userImage  ? (
                                <img
                                    alt={userName}
                                    src={userImage}
                                    draggable="false"
                                
                                    style={{ width: "50px", height: "40px", objectFit: "cover" }}
                                />
                                ) : (
                                    <div className="profile_avatar_circle-1" >
                                        {avatarLetter}
                                    </div>
                                )}
                                
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div className="header-title">{companyName}</div>
                                    <div className="header-subtitle">{address} , {country}</div>
                                </div>
                            </div>
                        </div>

                        {/* Rest of the dashboard UI */}
                        <div className="dashboard-content-grid">
                            <div className="bar-chart-card">
                                <div className="card-header">
                                    <span className="card-title">{t("asset_activity")}</span>
                                    <div className="tab-buttons">
                                        <button className={`tab-button ${activityInterval === "10-days" ? "active" : ""}`} onClick={() => setActivityInterval("10-days")}>{t("chart_btn_1")}</button>
                                        <button className={`tab-button ${activityInterval === "intra-day" ? "active" : ""}`} onClick={() => setActivityInterval("intra-day")}>{t("chart_btn_2")}</button>
                                    </div>
                                </div>
                                <StackedPercentageBarChart activityInterval={activityInterval}/>
                            </div>

                            <div className="notification-card">
                                <div className="card-header">
                                    <span className="card-title">{t("todays_notification")}</span>
                                    <a href="#" className="view-all">{t("all_notifications")}{" "}→</a>
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
                                    <div className="small-card-title">{t("card_sub_1")}</div>
                                    <div className="small-card-name">{t("card_title_1")}</div>
                                </div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/production-lines")}
                                style={{ cursor: "pointer" }}
                            >
                                <img src="/workspace.svg" className="img-smallcard" alt="Monitor Production Line" />
                                <div className="small-card-section">
                                    <div className="small-card-title">{t("card_sub_1")}</div>
                                    <div className="small-card-name">{t("card_title_2")}</div>
                                </div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/factory-site/factory-overview")}
                                style={{ padding: "0px", cursor: "pointer" }}
                            >
                                <img src="/factory-site-map.svg" alt="Manage Factory Sites" style={{ maxWidth: "100%" }} />
                                <div className="small-card-name" style={{ paddingLeft: "10px" }}>{t("card_title_3")}</div>
                            </div>

                            <div
                                className="small-card-list"
                                onClick={() => router.push("/reports")}
                                style={{ cursor: "pointer" }}
                            >
                                <img src="/analytics-icon.svg" className="img-smallcard" alt="Get Reports" />
                                <div className="small-card-section">
                                    <div className="small-card-title">{t("card_sub_2")}</div>
                                    <div className="small-card-name">{t("card_title_4")}</div>
                                </div>
                            </div>
                        </div>


                        {/* Xana Section */}
                        <div className="xana-container">
                            <div className="xana-content">
                                <img src="/ai-magic.svg" width={60} height={60} alt="AI Magic Icon" />
                                <div>
                                    <h1 className="xana-heading">{t("xana_banner.title")}</h1>
                                    <p className="xana-subheading">{t("xana_banner.sub")}</p>
                                    <p className="xana-subheading-section">
                                        {t("xana_banner.description")}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <button
                                    className="xana-button"
                                    onClick={handleXanaOpen}
                                    style={{ cursor: "pointer" }}
                                >
                                    <span><img style={{ width: "24px", height: "24px", paddingTop: "3px" }} src="/ai-audio.svg" /></span>{t("xana_banner.cta")}
                                </button>
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
                'button',
                'navigation'
            ])),
        },
    }
}
export default DashboardPage;