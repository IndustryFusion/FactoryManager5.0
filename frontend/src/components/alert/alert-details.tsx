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

import React, { useMemo, useState } from "react";
import { Dialog } from 'primereact/dialog';
import { Avatar } from "primereact/avatar";
import "../../app/globals.css"
import "../../styles/asset-list.css"
import { Button } from "primereact/button";
import { useTranslation } from "next-i18next";
import { Asset } from "@/types/asset-types";
import { Panel } from "primereact/panel";
import { Dropdown } from 'primereact/dropdown';


type AlertaState = "open" | "assign" | "ack" | "closed" | "expired";

const ALL_STATES: { label: string; value: AlertaState }[] = [
  { label: "Open", value: "open" },
  { label: "Assign", value: "assign" },
  { label: "Acknowledge", value: "ack" },
  { label: "Closed", value: "closed" },
  { label: "Expired", value: "expired" },
];

const NEXT_STATES: Record<AlertaState, AlertaState[]> = {
  open: ["assign", "ack", "closed", "expired"],
  assign: ["open", "ack", "closed", "expired"],
  ack: ["open", "assign", "closed", "expired"],
  closed: ["assign", "ack", "expired"], // omit "open" to avoid manual reopen (add it back if you want)
  expired: ["open"], // allow explicit reopen from expired (or set [] to disallow)
};

interface AlertDetailsProps {
  alerts: Alerts[];
  count: number;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  assetData: Asset[];
  handleAcknowledge: (id: string, status: AlertaState) => void;
}

interface Alerts {
  id: string;
  lastReceiveTime: string;
  previousSeverity: string;
  resource: string;
  severity: string;
  status: string;
  text: string;
  repeat: boolean;
  origin: string;
  type: string;
  updateTime: string;
}

const AlertDetails: React.FC<AlertDetailsProps> = ({ alerts, count, visible, setVisible, assetData, handleAcknowledge }) => {
  const { t } = useTranslation('button');
  const [selected, setSelected] = useState<AlertaState | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'ok':
        return {
          icon: 'pi pi-info-circle',
          color: "#04c904"
        };
      case 'warning':
        return {
          icon: 'pi pi-exclamation-circle',
          color: "#ffc107"
        }
      case 'machine-danger':
        return {
          icon: 'pi pi-exclamation-triangle',
          color: "#ff0000"
        };
      case 'machine-error':
        return {
          icon: 'pi pi-times',
          color: "#ff0000"
        }
      default:
        return { icon: '', color: '' };
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#ff0000';
      case 'assign':
        return '';
      case 'ack':
        return '';
      case 'closed':
        return '#058f05';
      case 'expired':
        return '';
      case 'blackout':
        return '';
      case 'shelved':
        return '';
      case 'unknown':
        return '';
    }
  }

  function AlertRow({
    alert,
    handleChangeStatus,
    t,
  }: {
    alert: Alerts;
    handleChangeStatus: (id: string, status: AlertaState) => void;
    t: (key: string) => string;
  }) {
    const [selected, setSelected] = useState<AlertaState | null>(null);

    const current = (alert.status || "").toLowerCase() as AlertaState;
    const allowed = (NEXT_STATES[current] ?? []).filter((s) => s !== current);
    const options = ALL_STATES.filter((o) => allowed.includes(o.value));

    return (
      <div key={alert.id} className="alert-row" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
        <Dropdown
          value={selected}
          options={options}
          onChange={(e) => setSelected(e.value)}
          placeholder={t("select_status")}
          style={{ width: "10px"}}
          className="w-full md:w-9rem"
        />
        <Button
          className="global-button"
          severity="warning"
          disabled={!selected}
          onClick={() => selected && handleChangeStatus(alert.id, selected)}
          tooltip={t("acknowledge_warn")}
        >
          {t("change_status")}
          <img src="/checkmark-circle-02 (1).svg" alt="change" className="ack-icon" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      contentClassName="alerts-details-content"
      headerClassName="alert-details-header"
      visible={visible}
      header={
        <div className="header-notification-container">
          <h3 className="asset-header-title">Notifications</h3>
          <p className="asset-header-sub-title">
            View all Notifications
            <span className="arrow-icon">
              <img src="/arrow-right-02.svg" alt="View All" />
            </span>
          </p>
        </div>
      }
      onHide={() => setVisible(false)}
      style={{ width: "40vw" }}
    >
      {count > 0 ? (
        alerts
          .map((alert, index) => {
            try {
              const findAsset = assetData.find(
                ({ id }: { id: string }) => id === alert?.resource
              );

              const text = alert?.text || "";
              const parts = text.split(". ");
              const extractedTextAfterFirstPeriod = parts[parts.length - 1];

              const urlRegex = /(https?:\/\/[^\s]+)/g;
              const match = text.match(urlRegex);

              let updatedText: React.ReactNode = "";
              let propertyName = "";

              const knownProperties = [
                "temperature",
                "humidity",
                "noise",
                "pressure",
                "vibration"
              ];

              if (Array.isArray(match) && match.length > 0) {
                propertyName = match[0].split("/").pop() || "";
                propertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1); // Capitalize first letter

                updatedText = (
                  <>
                    <span className="asset-property">
                      {propertyName}
                    </span>
                    : {extractedTextAfterFirstPeriod}
                  </>
                );
              }

              else {
                const foundProperty = knownProperties.find((prop) =>
                  text.toLowerCase().includes(prop.toLowerCase())
                );
                if (foundProperty) {
                  propertyName = foundProperty;
                  updatedText = `Property ${propertyName} : ${extractedTextAfterFirstPeriod}`;
                } else if (text.toLowerCase() === "all ok") {
                  return null;
                } else {
                  updatedText = text;
                }
              }

              return (
                <div key={index} className="alerts-container card mb-4" style={{ borderBottom: "1px solid #e0e0e0", marginTop: "0px" }}>
                  <div className="alert-content">
                    <div className="asset-first-content">
                      <div className="asset-first-left">
                        <i
                          className={getIcon(alert?.severity).icon}
                          style={{
                            fontSize: "1.3rem",
                            color: getIcon(alert?.severity).color
                          }}
                        ></i>
                        <span className="asset-warning">{updatedText}</span>
                      </div>
                      <div className="asset-time">{alert?.updateTime}</div>
                    </div>

                    <div className="asset-second-content">
                      <Panel
                        className="alert-panel"
                        onClick={() => toggleExpand(alert.id)}
                      >
                        <div className="product-panel-header flex align-items-center justify-content-between width-full">
                          <div className="flex align-items-center gap-3">
                            <img
                              src={findAsset?.image || "/avatar.svg"}
                              alt="product"
                              className="product-image"
                              onError={(e) =>
                                (e.currentTarget.src = "/placeholder-image.svg")
                              }
                            />
                            <div className="flex flex-column gap-1">
                              <span className="alert-product-name">
                                {findAsset?.product_name}
                              </span>
                              <span className="alert-factory-name">
                                <span className="alert-factory-sub-name">
                                  Area Name -{" "}
                                </span>
                                {findAsset?.factory_site || "Factory name"}
                              </span>
                              <span className="alert-factory-name">
                                <span className="alert-factory-sub-name">
                                  Status -{" "}
                                </span>
                                {alert?.status || "Unknown"}
                              </span>
                            </div>
                          </div>
                          <div className="arrow-wrapper">
                            <img
                              src={
                                expandedAlerts[alert.id]
                                  ? "/arrow-up.svg"
                                  : "/arrow-down.svg"
                              }
                              alt="toggle arrow"
                              className="dropdown-icon"
                            />
                          </div>
                        </div>

                        {expandedAlerts[alert.id] && (
                          <div className="alert-details-content">
                            <div className="alert-detail-item">
                              <label className="alert-label">Machine ID</label>
                              <span className="alert-value">
                                {findAsset?.id || ""}
                              </span>
                            </div>

                            <div className="alert-detail-grid">
                              <div className="alert-detail-item">
                                <label className="alert-label">Category</label>
                                <span className="alert-value">
                                  {findAsset?.asset_category || ""}
                                </span>
                              </div>

                              <div className="alert-detail-item">
                                <label className="alert-label">Type</label>
                                <span className="alert-value">
                                  {alert?.type || ""}
                                </span>
                              </div>

                              <div className="alert-detail-item">
                                <label className="alert-label">Status</label>
                                <span className="alert-value flex align-items-center gap-2">
                                  {alert?.status?.toLowerCase() === "closed" ? (
                                    <span
                                      className="px-2 py-1"
                                      style={{
                                        color: getStatusTextColor(alert?.status),
                                        border: `1px solid ${getStatusTextColor(
                                          alert?.status
                                        )}`,
                                        borderRadius: "4px"
                                      }}
                                    >
                                      Closed
                                    </span>
                                  ) : (
                                    <>
                                      {alert?.severity && (
                                        <span className="flex align-items-center gap-1">
                                          <img
                                            src={
                                              alert.severity.toLowerCase() ===
                                                "ok"
                                                ? "/alerts.svg"
                                                : "/checkmark-circle-green.svg"
                                            }
                                            alt="Previous Severity"
                                            className="status-icon"
                                          />
                                        </span>
                                      )}
                                      <img
                                        src="/arrow-left.svg"
                                        alt="arrow"
                                        className="arrow-icon"
                                      />
                                      Previously
                                      {alert?.previousSeverity && (
                                        <span className="flex align-items-center gap-1">
                                          <img
                                            src={
                                              alert.previousSeverity.toLowerCase() !==
                                                "ok"
                                                ? "/alerts.svg"
                                                : "/checkmark-circle-green.svg"
                                            }
                                            alt="Current Severity"
                                            className="status-icon"
                                          />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </span>
                              </div>

                              <div className="alert-detail-item">
                                <label className="alert-label">Origin</label>
                                <span className="alert-value">
                                  {alert?.origin || ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Panel>

                      <div>
                          <AlertRow
                            key={alert.id}
                            alert={alert}
                            handleChangeStatus={handleAcknowledge}
                            t={t}
                          />
                      </div>

                    </div>
                  </div>
                </div>
              );
            } catch (err) {
              console.log("alertlist skip", err);
              return null;
            }
          })
          .filter((component) => component !== null)
      ) : (
        <div className="notification mt-2 notification--empty flex flex-row gap-3 items-center">
          <Avatar icon="pi pi-inbox" shape="circle"></Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold" style={{ paddingTop: "5px" }}>
              No notifications
            </span>
          </div>
        </div>
      )
      }
    </Dialog>
  );
};

export default AlertDetails;