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

import { useDashboard } from "@/context/dashboard-context";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useState } from "react";
import { Button } from "primereact/button";
import { useTranslation } from "next-i18next";
import { Panel } from "primereact/panel";

interface NotificationPopupProps {
  notificationProp: boolean;
  setNotificationProp: Dispatch<SetStateAction<boolean>>;
}

interface Notification {
  lastReceiveTime: string,
  previousSeverity: string,
  resource: string,
  severity: string,
  status: string,
  text: string,
  repeat: boolean,
  origin: string,
  updateTime: string,
  type: string
}

const NotificationDialog: React.FC<NotificationPopupProps> = ({ notificationProp, setNotificationProp }) => {
  const { notificationData, selectedAssetData } = useDashboard();
  const { t } = useTranslation('button');
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>(
    {}
  );

  const toggleExpand = (notificationId: string) => {
    setExpandedAlerts((prev) => ({
      ...prev,
      [notificationId]: !prev[notificationId],
    }));
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
        };
      default:
        return undefined;
    }
  };

  const parseAlertMessage = (message: string) => {
    const regex =
      /(https:\/\/[^\s]+) failed for ([^\s]+)\. Value ([0-9.]+) is not ([<>=!]+) ([0-9.]+)/;
    const match = message.match(regex);
    if (!match) return null;
    const [, url, urn, value, condition, threshold] = match;
    const metricMatch = url.match(/\/v0\.1\/([^/]+)/);
    let metric = metricMatch ? metricMatch[1] : null;
    if (metric) {
      metric = metric.charAt(0).toUpperCase() + metric.slice(1);
    }

    return {
      metric,
      url,
      status: "failed",
      urn,
      value: parseFloat(value),
      condition,
      threshold: parseFloat(threshold),
    };
  };

  return (
    <>
      <Dialog
        contentClassName="alerts-details-content"
        header={
          notificationData.length > 0 ? (
            <h3 className="m-0">Notifications</h3>
          ) : (
            <h3 className="m-0">No Notifications</h3>
          )
        }
        visible={notificationProp}
        style={{ width: "40vw" }}
        onHide={() => setNotificationProp(false)}
      >
        <div className="alerts-container">
          {notificationData.length > 0 ? (
            notificationData.map((notification: Notification, index) => {
              const parsed = parseAlertMessage(notification?.text);
              let updatedText = notification?.text;

              if (parsed?.metric) {
                updatedText = `Property ${parsed.metric}: Value ${parsed.value} is not ${parsed.condition} ${parsed.threshold}`;
              }

              const iconData = getIcon(notification?.severity);

              return (
                <div key={index} className="alerts-container"  style={{ borderBottom: "1px solid #e0e0e0", marginTop:"0px" }}>
                  <div className="alert-content">
                    <div className="asset-first-content">
                      <div className="asset-first-left">
                        {iconData && (
                          <i
                            className={iconData.icon}
                            style={{
                              fontSize: "1.3rem",
                              color: iconData.color,
                            }}
                          ></i>
                        )}
                        <span className="asset-warning">{updatedText}</span>
                      </div>
                      <div className="asset-time">
                        {notification?.updateTime}
                      </div>
                    </div>

                    <div className="asset-second-content">
                      <Panel
                        className="alert-panel"
                        onClick={() => toggleExpand(notification.id)}
                      >
                        <div className="product-panel-header flex align-items-center justify-content-between width-full">
                          <div className="flex align-items-center gap-3">
                            <img
                              src={selectedAssetData?.image || "/avatar.svg"}
                              alt="product"
                              className="product-image"
                              onError={(e) =>
                                (e.currentTarget.src = "/placeholder-image.svg")
                              }
                            />
                            <div className="flex flex-column gap-1">
                              <span className="alert-product-name">
                                {selectedAssetData?.product_name}
                              </span>
                              <span className="alert-factory-name">
                                <span className="alert-factory-sub-name">
                                  {" "}
                                  Area Name -{" "}
                                </span>
                                {selectedAssetData?.factory_site ||
                                  "Factory name"}
                              </span>
                            </div>
                          </div>
                          <div className="arrow-wrapper">
                            <img
                              src={
                                expandedAlerts[notification.id]
                                  ? "/arrow-up.svg"
                                  : "/arrow-down.svg"
                              }
                              alt="toggle arrow"
                              className="dropdown-icon"
                            />
                          </div>
                        </div>

                        {expandedAlerts[notification.id] && (
                          <div className="alert-details-content">
                            <div className="alert-detail-item">
                              <label className="alert-label">Machine ID</label>
                              <span className="alert-value">
                                {selectedAssetData?.id || ""}
                              </span>
                            </div>
                           
                            <div className="alert-detail-grid">
                              <div className="alert-detail-item">
                                <label className="alert-label">Category</label>
                                <span className="alert-value">
                                  {selectedAssetData?.asset_category || ""}
                                </span>
                              </div>

                              <div className="alert-detail-item">
                                <label className="alert-label">Type</label>
                                <span
                                  className="alert-value"
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {notification?.type || ""}
                                </span>
                              </div>

                              <div className="alert-detail-item">
                                <label className="alert-label">Status</label>
                                <span className="alert-value flex align-items-center gap-2">
                                  {notification?.status?.toLowerCase() ===
                                  "closed" ? (
                                    <span
                                      className="px-2 py-1"
                                      style={{
                                        color: getStatusTextColor(
                                          notification?.status
                                        ),
                                        border: `1px solid ${getStatusTextColor(
                                          notification?.status
                                        )}`,
                                        borderRadius: "4px",
                                      }}
                                    >
                                      Closed
                                    </span>
                                  ) : (
                                    <>
                                      {notification?.previousSeverity && (
                                        <span className="flex align-items-center gap-1">
                                          <img
                                            src={
                                              notification.previousSeverity.toLowerCase() ===
                                              "warning"
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
                                      {notification?.severity && (
                                        <span className="flex align-items-center gap-1">
                                          <img
                                            src={
                                              notification.severity.toLowerCase() ===
                                              "warning"
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
                                  {notification?.origin || ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Panel>

                      <div className="alert-btn">
                        <Button
                          className="global-button"
                          style={{ marginTop: "16px" }}
                          severity="warning"
                        >
                          {t("acknowledge")}
                          <img
                            src="/checkmark-circle-02 (1).svg"
                            alt="ack"
                            className="ack-icon"
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-column justify-content-center align-items-center">
              <p>When you have notifications, you'll see them here</p>
              <img
                src="/no-notification2.png"
                alt="no notifications icon"
                width="15%"
                height="15%"
              />
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}

export default NotificationDialog;