// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 
import React, { useEffect, useState, useRef } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import Alerts from "../alert/alerts";
import { getAccessGroup } from "@/utility/indexed-db";
import { getCompanyDetailsById, getUserDetails } from "@/utility/auth";
import ProfileDialog from "./profile-dialog";
import { useDispatch } from "react-redux";
import { resetTimer, logout } from "@/redux/auth/authSlice";
import { useTranslation } from "next-i18next";
import Language from "./language";
import { Toast } from "primereact/toast";
import '@/styles/navbar.css'

type UserData = {
  user_name: string;
  company_id: string;
  company_name: string;
  user_image: string
};

const HorizontalNavbar: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation('header');
  const [profileDetail, setProfileDetail] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const dispatch = useDispatch();
  const toastRef = useRef<Toast>(null);

  const fetchCompanyDetails = async (companyIfricId: string) => {
    try {
      const response = await getCompanyDetailsById(companyIfricId);
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
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

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <div className="flex justify-content-between align-items-center p-1">
      <div className="mr-3 language-dropdown">
        <Language />
      </div>
      <Button icon="pi pi-warehouse" link
        style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
        tooltip="Asset Management"
        tooltipOptions={{ position: 'bottom' }}
        onClick={() => router.push("/asset-management")}
      />
      <Button
        className="nav_icon_button"
        onClick={() => router.push("/factory-site/dashboard")}
        title="Dashboard"
      >
        <img src="/app-icon.svg" alt="Dashboard" style={{width:"20px"}} />
      </Button>
      <div className="mr-4"><Alerts /></div>
       <div 
          className="nav_avatar" 
          onClick={() => setProfileDetail(true)}
          style={{
          width: '40px',
          height: '40px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 500,
          color: 'white',
          backgroundColor: '#2b2b2b',
          borderRadius: '100px',
          paddingTop: '3px',
          cursor: 'pointer',
          overflow: 'hidden'
      }}
      >
      {(userData?.user_image && userData?.user_image.length > 0) ? (
        <img 
          src={userData.user_image} 
          alt="Profile" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} 
        />
      ) : (
        userData?.user_name.charAt(0).toUpperCase()
      )}
    </div>
      {profileDetail && (
        <ProfileDialog
          profileDetailProp={profileDetail}
          setProfileDetailProp={setProfileDetail}
        />
      )}
    </div>
  );
};

export default HorizontalNavbar;
