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

import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import { useTranslation } from "next-i18next";

const VerticalNavbar = () => {
  const { t } = useTranslation('button');
  const [isMobile, setIsMobile] = useState(false);
  const buttonStyle = {
    backgroundColor: "white", // Set background color to grey
    color: "black", // Set text and icon color to white
    border: "none",
    width: "100%",
    justifyContent: isMobile ? "center" : "flex-start", // Center the icon in mobile view
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const numberOfAssets = 5;

  return (
    <div
      style={{
        borderRight: "1px solid grey",
        maxWidth: isMobile ? "60px" : "25%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        top: -6,
        position: "static",
      }}
    >
      <div
        className="flex flex-column"
        style={{
          height: "100%",
          backgroundColor: "white",
          marginTop: isMobile ? "0" : "2rem",
        }}
      >
        <Button
          label={isMobile ? "" : t('dashboard')}
          icon="pi pi-fw pi-home"
          className="mb-2"
          style={buttonStyle}
          tooltip={isMobile ? "Dashboard" : ""}
          tooltipOptions={{ position: "right" }}
        />
        <Button
          label={isMobile ? "" : t('assets')}
          icon="pi pi-fw pi-briefcase"
          className="mb-2"
          style={buttonStyle}
          badge={isMobile ? "" : numberOfAssets.toString()}
          tooltip={isMobile ? "Assets" : ""}
          tooltipOptions={{ position: "right" }}
        />

        {!isMobile && (
          <div
            className="text-left"
            style={{ color: "black", marginTop: "auto" }}
          >
            <span>Factory Admin</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerticalNavbar;
