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

import React from "react";
import { Dialog } from 'primereact/dialog';
import { Avatar } from "primereact/avatar";
import "../../app/globals.css"
import "../../styles/asset-list.css"
import { Button } from "primereact/button";
import { useTranslation } from "next-i18next";
interface AlertDetailsProps {
  alerts: Alerts[];
  count: number;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  assetData: any;
}

interface Alerts {
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

const AlertDetails: React.FC<AlertDetailsProps> = ({ alerts, count, visible, setVisible, assetData }) => {

  const { t } = useTranslation('button');

  // Define CSS style for the badge
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-9px',
    right: '-6px',
    fontSize: '0.2rem',
  };

  // Get the alert color based on severity
  const getAlertColor = (severity: string) => {
    console.log('severity ', severity);
    switch (severity) {
      case 'warning':
        return 'orange';
      case 'danger':
        return 'red';
      case 'normal':
        return 'green';
      default:
        return 'black';
    }
  };

  // Get the icon and color based on severity
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
        return{
          icon: 'pi pi-times',
          color: "#ff0000"
        }
      default:
      return { icon: '', color: '' };
    }
  };

  // Get the text color based on severity
  const getTextColor = (severity: string) => {
    switch (severity) {
      default:
      case 'ok':
        return '#00ff00';
      case 'warning':
        return '#ffcc00';
      case 'machine-warning':
        return '#ffcc00';
      case 'machine-error':
        return '#ff0000';
    }
  };

  // Get the text color for status
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

  const getBackgroundColor = (severity: string) => {
    switch (severity) {
      default:
      case 'ok':
        return '#f0f0f0';
      case 'warning':
        return '#ffeecc';
      case 'machine-warning':
        return '#ffeecc';
      case 'machine-error':
        return '#ffcccc';
    }
  };

  return (
    <>
      <Dialog
        visible={visible}
        header={<span style={{ fontWeight: 600 }}>Notifications</span>}
        onHide={() => { setVisible(false) }} style={{ width: '50vw' }}
      >
        {
          count > 0 ? (         
              alerts.map((alert, index) => {
                try {
                    const findAsset = assetData.find(({ id }: { id: string }) => (id === alert?.resource));
                    console.log("findAsset" + index, findAsset);
                    const text = alert?.text;
                    let updatedText;
            
                    // Regular expression to match the URL and extract the fragment
                    const urlRegex = /http:\/\/www\.industry-fusion\.org\/fields#([^ ]+)/;
                    const match = text.match(urlRegex);
            
                    if (match) {                 
                        const fragment = match[1];            
                        // Regular expression to match the value after "Value"
                        const valueRegex = /Value.*$/;
                        const valueMatch = text.match(valueRegex);
            
                        if (valueMatch) {
                            updatedText = `Property #${fragment} : ${valueMatch[0]}`;
                        }
                    } else {
                        updatedText = text;
                    }
                      
                      return (
                        <>
                          <div key={index} className="alerts-container card mb-4">
                            <div className="flex gap-3  ">
                              <div className="mt-4">
                                <i className={getIcon(alert?.severity).icon} style={{ fontSize: '1.3rem', color: getIcon(alert?.severity).color }}></i>
                              </div>
                              <div  className="data-container">
                                <div>
                                  <div className=" align-center">
                                    <p className="ml-2 mb-0"
                                      style={{
                                        fontStyle: 'italic',
                                        color: "#d5d5d5",
                                        fontSize: "15px"
                                      }}
                                    >{findAsset?.product_name} - {findAsset?.id}  </p>
                                  </div>
                                  <div className="flex align-center">
                                    <p className="ml-2 alert-type-text mb-0"> {updatedText}</p>
                                  </div>
                                  <div className="flex align-center">
                                    <p className="ml-2 alert-text mb-0 "></p>
                                  </div>
                                  <div className="flex align-center  mb-2" style={{ gap: "9rem" }}>
                                    <div>
                                      <p className="ml-2 alert-time mt-2"> {alert?.updateTime}</p>
                                      <p className="label-text ml-2">Update Time</p>
                                    </div>
                                    <div>
                                      <p className="ml-2 mt-2 "
                                        style={{ color: "#212529", textTransform: "capitalize" }}
                                      >{alert?.type}</p>
                                      <p className="label-text ml-2">Type</p>
                                    </div>
                                  </div>
                                  <div className="flex align-center  mb-2" style={{ gap: "14.4rem" }}>
                                    <div>
                                      <p className="ml-2 "> {findAsset?.asset_category}</p>
                                      <p className="label-text ml-2">Product category</p>
                                    </div>
                                    <div>
                                      <p>{alert?.origin}</p>
                                      <p className="label-text">Origin</p>
                                    </div>
                                  </div>
                                  <div className="flex align-center  mb-2" style={{ gap: "16.8rem" }}>
                                    <div> <p className="ml-2 "> {alert?.severity}</p>
                                      <p className="label-text ml-2">Severity</p>
                                    </div>
                                    <div>
                                      <p className="ml-2 mt-2" style={{ color: "#212529" }}
                                      >{alert?.previousSeverity}</p>
                                      <p className="label-text ml-2">Previous Severity</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex  flex-column ">
                                  <p className="ml-2 mt-2 px-1 "
                                    style={{
                                      color: getStatusTextColor(alert?.status),
                                      border: `1px solid ${getStatusTextColor(alert?.status)}`,
                                      borderRadius: "4px"
                                    }}
                                  > {alert?.status}</p>
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
                        </>
                      )
          
          }
              catch (err) {
                console.log("alertlist skip", err);
                return null;
              }
              
            }
            ).filter(component => component !== null)
          ) : (
            <div className="notification notification--empty flex flex-row gap-3 items-center">
              <Avatar icon="pi pi-inbox" shape="circle"></Avatar>
              <div className="flex flex-col text-sm">
                <span className="font-semibold" style={{ paddingTop: '5px' }}>No notifications</span>
              </div>
            </div>
          )
        }
      </Dialog>
    </>
  );
};

export default AlertDetails;