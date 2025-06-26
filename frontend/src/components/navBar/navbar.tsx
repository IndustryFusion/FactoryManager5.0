import { useTranslation } from "next-i18next";
import { BreadCrumb } from "primereact/breadcrumb";
import "../../styles/navbar.css";
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
import Language from "./language";
import ProfileMenu from "./profile-menu";

import { ReactNode } from "react";

type NavbarProps = {
  navHeader?: string | ReactNode;
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
  const toastRef = useRef(null);

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

        const companyDetails = await fetchCompanyDetails(data.company_ifric_id);
        
        const dataToSend = {
          user_email: companyDetails.email,
          company_ifric_id: companyDetails.company_ifric_id,
        };

        const response = await getUserDetails(dataToSend);

        if(Object.keys(companyDetails).length) {
          setUserData((prevState) => ({
            ...prevState!,
            company_name: companyDetails.company_name,
            user_image: response?.data[0].user_image ? response?.data[0].user_image : ""
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchCompanyDetails = async (companyIfricId: string) => {
    try {
      const response = await getCompanyDetailsById(companyIfricId);
      if (response?.data?.[0]) {
        return response.data[0];
      }
      return {};
    } catch (error) {
      console.error("Failed to fetch company details:", error);
      return {};
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userInfo]);

  const fullPath = router.asPath;
  const breadcrumbItems = generateBreadcrumbItems();
  const showBackButton = breadcrumbItems.length >= 2;

  const handleBackClick = () => {
    router.back();
  };

  const home = router.pathname === "/dashboard" ? undefined : {
  label: "",
  url: "/factory-site/factory-overview",
  template: () => (
    <div className="flex gap-1 align-items-center">
      {showBackButton && (
        <Button
          icon="pi pi-angle-double-left"
          onClick={handleBackClick}
          className="p-button-text p-button-rounded p-button-secondary -ml-3"
          style={{ color: "#6c757d", padding: "0px 2px 0px 12px", height: "auto", width: "fit-content" }}
          aria-label="Go back"
        />
      )}
      <Button
        className="p-button-text p-button-rounded"
        onClick={() => router.push("/factory-site/factory-overview")}
        style={{ padding: 0 }}
      >
        <Image
          src="/bread-crum/home_icon.svg"
          alt="Home"
          width={18}
          height={17}
        />
      </Button>
    </div>
  ),
};


  function generateBreadcrumbItems(): BreadcrumbItem[] {
    const createLastItem = (label: string): BreadcrumbItem => ({
      label,
      className: "current-page",
      command: (event: any) => {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
      },
    });
     
    const getUrnId = (path: string) => {
      const match = path.match(/urn:ngsi-ld:factories:[^/]+/);
      return match ? match[0] : '';
    };

    const currentUrnId = getUrnId(fullPath);

    // Route-specific breadcrumbs with dynamic URN handling
    if (fullPath.startsWith('/factory-site/factory-shopfloor/urn:ngsi-ld:factories')) {
      return [
        { 
          label: "Factory Flow", 
          url: `/factory-site/factory-management/${currentUrnId}`
        },
        createLastItem("Pick List")
      ];
    }

    if(fullPath.startsWith('/binding/create')){
    return[
      { 
        label: "Binding Request", 
        url: "/binding-request"
      },
      createLastItem("Create Binding")
    ]
    }

    if(fullPath.startsWith('/binding/')){
      return[
        { 
          label: "Binding Manager", 
          url: "/binding-manager"
        },
        createLastItem("Binding")
      ]
      }
      if(fullPath.startsWith('/contract/')){
        return[
          { 
            label: "Contract Manager", 
            url: "/contract-manager"
          },
          createLastItem("Contract")
        ]
        }
    // Route-specific breadcrumbs
    const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
      "/factory-site/factory-overview": [], // No breadcrumb for this route
      "/factory-site/factory-management/urn:ngsi-ld:factories": [
        { label: "Factory Flow", url: "#" }
      ],
      "/factory-site/dashboard": [
        { label: "Dashboard", }
      ],
      "/asset-management": [
        { label: "Asset Management", url: "#" }
      ],
      "/certificates": [
        { label: "Certificate", url: "#" }
      ],
      "/contract-manager": [
        { label: "Contract Manager", url: "#" }
      ],
      "/add-contract": [
        { label: "Contract Manager", url: "/contract-manager" },
        createLastItem("Add Contract")
      ],
       "/binding-manager": [
        { label: "Binding Manager", url: "#" }
      ],
      "/create-binding": [
        { label: "Binding Manager", url: "/binding-manager" },
        createLastItem("Create Binding")
      ],
      "/binding-request": [
        { label: "Binding Request", url: "#" }
      ]

    };

    // Get the matching route configuration
    let items = [...(routeBreadcrumbs[fullPath] || [])];

    // If no exact match, check for partial matches
    if (!routeBreadcrumbs[fullPath]) {
      for (const route in routeBreadcrumbs) {
        if (fullPath.startsWith(route)) {
          items = [...routeBreadcrumbs[route]];
          break;
        }
      }
    }

    // Make the last item non-clickable
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      items[items.length - 1] = createLastItem(lastItem.label);
    }

    return items;
  }



  return (
    <>
      <Toast ref={toastRef} />
      <div className="flex gap-3 align-items-center asset-overview-header justify-content-between">
        <div className="flex justify-content-between">
          <div className="flex align-items-center">
            <div>
              <h2 className="nav-header">{navHeader}</h2>
              {fullPath !== "/factory-site/factory-overview" && (
                <BreadCrumb
                  model={breadcrumbItems}
                  home={home}
                  className={`nav-breadcrumb p-0 border-none bg-transparent ${
                    breadcrumbItems.length < 2 ? "mt-2" : ""
                  }`}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 nav-items">
          {/* //just commneted out the language fetaures just for now since we will add more translation in future */}
          {/* <div className="language-dropdown">
            <Language />
          </div> */}
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
          <ProfileMenu />
        </div>
      </div>
    </>
  );
};

export default Navbar;