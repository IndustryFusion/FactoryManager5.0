import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";

const VerticalNavbar = () => {
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
          label={isMobile ? "" : "Dashboard"}
          icon="pi pi-fw pi-home"
          className="mb-2"
          style={buttonStyle}
          tooltip={isMobile ? "Dashboard" : ""}
          tooltipOptions={{ position: "right" }}
        />
        <Button
          label={isMobile ? "" : "Assets"}
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
