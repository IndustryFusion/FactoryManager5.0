import { useDashboard } from "@/context/dashboard-context";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getAlerts } from "../alert/alert-service";
import { Button } from "primereact/button";
import { useTranslation } from "next-i18next";

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
  origin: string
}

const NotificationDialog: React.FC<NotificationPopupProps> = ({ notificationProp, setNotificationProp }) => {
  const { entityIdValue, notificationData, selectedAssetData } = useDashboard();
  const { t } = useTranslation('button');
  
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
        }
    }
  };



  return (
    <>
      <Dialog
        header={notificationData.length > 0 ? "Notifications" : "No Notifications"}
        visible={notificationProp} style={{ width: '50vw' }} onHide={() => setNotificationProp(false)}>
        <div className="alerts-container">
          {notificationData.length > 0 ?
            notificationData.map((notification: Notification, index) => {

              const text = notification?.text;
              let updatedText;
              if (text && text.includes("http://www.industry-fusion.org/fields#noise")) {
                const regex = /Value.*$/;
                const match = text.match(regex);
                if (match) {
                  updatedText = "Property #noise : " + match[0];
                }
              }
              else {
                updatedText = text;
              }

              return (
                <div key={index} className="alerts-container card mb-4">
                  <div className="flex gap-3  ">
                    <div className="mt-4">
                      <i className={getIcon(notification?.severity).icon} style={{ fontSize: '1.3rem', color: getIcon(notification?.severity).color }}></i>
                    </div>
                    <div style={{ flex: "0 90%" }} className="data-container">
                      <div>
                        <div className=" align-center">
                          {/* <p className="font-medium">Product name: </p> */}
                          <p className="ml-2 mb-0"
                            style={{
                              fontStyle: 'italic',
                              color: "#d5d5d5",
                              fontSize: "15px"
                            }}
                          >{selectedAssetData?.product_name} - {selectedAssetData?.id}  </p>
                        </div>

                        <div className="flex align-center">
                          <p className="ml-2 alert-type-text mb-0"> {updatedText}</p>
                        </div>
                        <div className="flex align-center">
                          <p className="ml-2 alert-text mb-0 "></p>
                        </div>
                        <div className="flex align-center  mb-2" style={{ gap: "9rem" }}>
                          <div>
                            <p className="ml-2 alert-time mt-2"> {notification?.updateTime}</p>
                            <p className="label-text ml-2">Update Time</p>
                          </div>
                          <div>
                            <p className="ml-2 mt-2 "
                              style={{ color: "#212529", textTransform: "capitalize" }}
                            >{notification?.type}</p>
                            <p className="label-text ml-2">Type</p>
                          </div>
                        </div>
                        <div className="flex align-center  mb-2" style={{ gap: "14.4rem" }}>
                          <div>
                            <p className="ml-2 "> {selectedAssetData?.asset_category}</p>
                            <p className="label-text ml-2">Product category</p>
                          </div>
                          <div>
                            <p>{notification?.origin}</p>
                            <p className="label-text">Origin</p>
                          </div>
                        </div>
                        <div className="flex align-center  mb-2" style={{gap: "16.8rem" }}>
                          <div> <p className="ml-2 "> {notification?.severity}</p>
                            <p className="label-text ml-2">Severity</p>
                          </div>
                          <div>
                            <p className="ml-2 mt-2" style={{ color: "#212529" }}
                            >{notification?.previousSeverity}</p>
                            <p className="label-text ml-2">Previous Severity</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex  flex-column ">
                        <p className="ml-2 mt-2 px-1 "
                          style={{
                            color: getStatusTextColor(notification?.status),
                            border: `1px solid ${getStatusTextColor(notification?.status)}`,
                            borderRadius: "4px"
                          }}
                        > {notification?.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className='alert-btn'>
                    <Button
                      className="alert-btn-text"
                      label={t('acknowledge')}
                      severity="warning"
                    />
                  </div>
                </div>
              )
            })
            :
            <>
              <div className="flex flex-column justify-content-center align-items-center">
                <p>When you have notification , you'll see them here</p>
                <img src="/no-notification2.png" alt="no notifications icon"
                  width="15%" height="15%"
                />
              </div>
            </>
          }
        </div>
      </Dialog>
    </>
  )
}

export default NotificationDialog;