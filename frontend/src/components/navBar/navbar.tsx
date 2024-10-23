import { useTranslation } from "next-i18next";
import { BreadCrumb } from "primereact/breadcrumb";
import "../../styles/navbar.css";
import ProfileDialog from "./profile-dialog";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getAccessGroup } from "@/utility/indexed-db";
import Image from "next/image";
import Link from "next/link";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { getCompanyDetailsById } from "@/utility/auth";
import { Toast } from "primereact/toast";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { getUserDetails } from "@/utility/auth";
import Alerts from "@/components/alert/alerts"

type NavbarProps = {
  navHeader?: string;
  previousRoute?: {
    path: string;
    label: string;
  };
};

type UserData = {
  user_name: string;
  company_id: string;
  company_name: string;
  user_image: string
};

type BreadcrumbItem = {
  label: string;
  url?: string;
  className?: string;
  command?: (event: any) => void;
};

const Navbar: React.FC<NavbarProps> = ({ navHeader, previousRoute }) => {
  const userInfo = useSelector((state: RootState) => state.factoryUserSlice);
  const { t } = useTranslation(["overview", "placeholder"]);
  const [profileDetail, setProfileDetail] = useState(false);
  const router = useRouter();
  const [userData, setUserData] = useState<UserData>(userInfo);
  const [previousPageRoute, setPreviousPageRoute] = useState<string | null>(
    null
  );
  const toastRef = useRef(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastRef.current?.show({
        severity: "success",
        summary: "Copied",
        detail: "IFRIC ID copied to clipboard",
        life: 3000,
      });
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const fetchCompanyDetails = async (
    companyIfricId: string
  ) => {
    try {
      const response = await getCompanyDetailsById(companyIfricId);
      console.log("Full API response:", response);
      
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log("API response data:", response.data);
        console.log("First item in data array:", response.data[0]);

        return response.data[0];
      } else {
        console.log("API response does not contain expected data structure");
        return {};
      }
    } catch (error) {
      console.error("Failed to fetch company details:", error);
      return {};
    }
  };

  const fetchUserData = async () => {
    try {
      const data = await getAccessGroup();
      if (data) {
        const initialUserData: UserData = {
          user_name: data.user_name,
          company_id: data.company_ifric_id,
          company_name: "",
          user_image: ""
        };

        setUserData(initialUserData);

        // Fetch company details
        const companyDetails = await fetchCompanyDetails(data.company_ifric_id);
        console.log("Fetched company name:", companyDetails);

        const dataToSend = {
          user_email: companyDetails.email,
          company_ifric_id: companyDetails.company_ifric_id,
        };

        // Fetch user data
        const response = await getUserDetails(dataToSend);

        if(Object.keys(companyDetails).length) {
          setUserData((prevState) => {
            const newState = {
              ...prevState!,
              company_name: companyDetails.company_name,
              user_image: response?.data[0].user_image ? response?.data[0].user_image : ""
            };
            console.log("Updated user data state:", newState);
            return newState;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userInfo]);

  useEffect(() => {
    const storedPreviousRoute = localStorage.getItem("previousRoute");
    setPreviousPageRoute(storedPreviousRoute);

    const handleRouteChange = (url: string) => {
      localStorage.setItem("previousRoute", router.asPath);
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  const createAssetRoute = previousPageRoute?.includes(
    "/asset/create/create-asset"
  );

  const fullPath = router.asPath;
const home = {
    label: "",
    url: "/factory-site/factory-overview",
    template: () => (
      <div className="flex gap-1 align-items-center">
        {showBackButton && (
          <Button
            icon="pi pi-angle-double-left"
            onClick={handleBackClick}
            className="p-button-text p-button-rounded p-button-secondary -ml-1"
            style={{ color: "#6c757d", padding: "0px 2px 0px 12px", height: "auto", width: "fit-content" }}
            aria-label="Go back"
          />
        )}
        <Link href="/factory-site/factory-overview" legacyBehavior>
          <Image
            src="/bread-crum/home_icon.svg"
            alt="Home"
            width={18}
            height={17}
            style={{ cursor: "pointer" }}
            className=""
          />
        </Link>
      </div>
    ),
  };

  const generateBreadcrumbItems = (): BreadcrumbItem[] => {
    let items: BreadcrumbItem[] = [];

    const createLastItem = (label: string): BreadcrumbItem => ({
      label,
      className: "current-page",
      command: (event: any) => {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
      },
    });

    // New specific route handling
    if (fullPath === "/factory-site/factory-overview") {
      return [];  // Only home icon will be shown
    }

    if (fullPath.startsWith("/factory-site/factory-management/urn:ngsi-ld:factories")) {
      return [createLastItem("Factory Flow")];
    }

    if (fullPath === "/factory-site/dashboard") {
      return [createLastItem("Dashboard")];
    }

    if (fullPath === "/asset-management") {
      return [createLastItem("Asset Management")];
    }
    // Default path handling for unspecified routes
    let pathParts = fullPath.split("/").filter((part) => part);
    if (pathParts.length === 0) return [];

    pathParts.forEach((part, index) => {
      const isLast = index === pathParts.length - 1;
      const label = part
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      if (isLast) {
        items.push(createLastItem(label));
      } else {
        items.push({
          label,
          url: `/${pathParts.slice(0, index + 1).join("/")}`
        });
      }
    });

    return items;
  };

  const breadcrumbItems = generateBreadcrumbItems();
  const showBackButton = breadcrumbItems.length >= 2;

  const handleBackClick = () => {
    router.back();
  };


  return (
    <>
      <Toast ref={toastRef} />
      <div className="flex gap-3 align-items-center asset-overview-header justify-content-between">
        <div className="flex justify-content-between">
          <div className="flex align-items-center">
            <div>
              <h2 className="nav-header">
                {fullPath.includes(
                  "/digital-pass-creator/qr-code-generator/urn:ifric:"
                ) && createAssetRoute
                  ? "Create Digital Product Pass"
                  : navHeader}
              </h2>
              {router.pathname !== "/dashboard" ? (
                <BreadCrumb
                  model={breadcrumbItems}
                  home={home}
                  className={`nav-breadcrumb p-0 border-none bg-transparent ${
                    breadcrumbItems.length < 2 ? "mt-2 ml-2" : ""
                  }`}
                />
              ) : (
                <div className="flex align-items-center">
                  <div className="flex flex-column">
                    <h2 className="dashboard-user-name">
                      {userData?.company_name}
                    </h2>
                    <div className="flex align-items-center">
                      <h3 className="user-company-name">
                        {userData?.company_id}
                      </h3>
                      <Button
                        icon="pi pi-copy"
                        onClick={() =>
                          copyToClipboard(userData?.company_id || "")
                        }
                        className="p-button-text p-button-rounded p-button-secondary ml-2"
                        tooltip="Copy IFRIC ID"
                        tooltipOptions={{ position: "top" }} style={{flexShrink: "0"}}
                      />
                    </div>
                  </div>
                  <Message
                    severity="info"
                    text="In the background, verification of company details is in progress; we will notify you."
                    className="certificate-msg-nav ml-8 mt-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 nav-items">
          <Button
            icon="pi pi-box"
            onClick={() => router.push("/asset-management")}
            className="p-button-rounded p-button-text"
            tooltip="Asset Management"
            tooltipOptions={{ position: 'bottom' }}
            style={{ color: '#6c757d' }}
          />
         <Alerts/>
          <Button
            icon="pi pi-th-large"
            onClick={() => router.push("/factory-site/dashboard")}
            className="p-button-rounded p-button-text"
            tooltip="Dashboard"
            tooltipOptions={{ position: 'bottom' }}
            style={{ color: '#6c757d' }}
          />
          <div className="nav_avatar" onClick={() => setProfileDetail(true)}>
            {(userData?.user_image && userData?.user_image.length > 0) ?
              <img src={userData.user_image} alt="Image" style={{borderRadius: "100px"}} width="45" height="45" />
              :
              userData?.user_name.charAt(0).toUpperCase()
            }
          </div>
        </div>
      </div>
      {profileDetail && (
        <ProfileDialog
          profileDetailProp={profileDetail}
          setProfileDetailProp={setProfileDetail}
        />
      )}
    </>
  );
};

export default Navbar;
