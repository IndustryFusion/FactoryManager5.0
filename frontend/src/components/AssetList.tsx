import React, { useState } from "react";
import { Button } from "primereact/button";
import { Asset } from "@/interfaces/AssetTypes";

interface AssetDetailsCardProps {
  asset: Asset;
  setShowExtraCard: any;
}

export default function AssetDetailsCard({ asset, setShowExtraCard }: AssetDetailsCardProps) {
  const [selectedTab, setSelectedTab] = useState("general");
  const [selectedData, setSelectedData] = useState<{
    [key: string]: { type: string; value: string };
  } | null>(null);

  const handleTabChange = (tabName: string) => {
    setSelectedTab(tabName);
  };

  // This is a sample function that handles row selection, you should adapt it to your actual use case.
  const handleRowSelect = (data: any) => {
    setSelectedData(data);
  };
  console.log("card details.", asset);

  const renderGeneralContent = () => {
    return (
      <div>
        {asset && (
          <>
            {Object.entries(asset).map(([key, value]) => {
              if (
                key !== "https://industry-fusion.org/base/v0.1/templateId" &&
                typeof value === "object" &&
                value?.type === "Property"
              ) {
                let displayValue: any = value.value;
                const label = key.replace(
                  "http://www.industry-fusion.org/schema#",
                  ""
                );
                if (displayValue && (typeof displayValue == 'string') && (displayValue.includes('png') || displayValue.includes('jpg') || displayValue.includes('jpeg') || displayValue.includes('.pdf'))) {
                  displayValue = displayValue.split('/').pop();
                }
                return (
                  <div key={key}>
                    <p>
                      <span className="font-semibold mr-2">{label}:</span>
                      <span>{displayValue}</span>
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </>
        )}
      </div>
    );
  };

  const renderRelationsContent = () => {
    return <div></div>;
  };

  const renderContent = () => {
    if (selectedTab === "general") {
      return renderGeneralContent();
    } else if (selectedTab === "relations") {
      return renderRelationsContent();
    }
  };

  return (
    <div className="ml-2" style={{ marginTop: "10rem", overflowY: "scroll", maxHeight: "400px" }}>
      <div className="flex">
        <Button
          label="General"
          severity="secondary"
          outlined
          onClick={() => handleTabChange("general")}
        />
        <Button
          label="Relations"
          severity="secondary"
          outlined
          className="ml-5"
          onClick={() => handleTabChange("relations")}
        />
        <Button
          icon="pi pi-times"
          className="p-button-rounded p-button-secondary p-button-sm"
          onClick={() => setShowExtraCard(false)}
          style={{ marginLeft: "10rem" }}
        />
      </div>
      <div className="card-content scrollable-content">{renderContent()}</div>
    </div>
  );
}
