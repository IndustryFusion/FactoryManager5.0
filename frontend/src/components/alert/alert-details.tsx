import React, { Dispatch, SetStateAction, useState } from "react";
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Avatar } from "primereact/avatar";
import "../../app/globals.css"
import "../../styles/asset-list.css"
import { Button } from "primereact/button";

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

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-9px',
    right: '-6px',
    fontSize: '0.2rem',
  };

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
  const getIcon = (severity: string) => {
    console.log(severity, "what's the value here");
    
    switch (severity) {
      case 'ok':
        return {
          icon: 'pi pi-info-circle',
          color: "#04c904"};
      case 'warning':
        return {
          icon:'pi pi-exclamation-circle',
          color: "#ffc107"
        }
      // case 'machine-danger':
      //   return 'pi pi-exclamation-triangle';
      // case 'machine-error':
      //   return 'pi pi-times';
    }
  };


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

  const getStatusTextColor =(status:string)=>{
    switch(status){
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
        return'';
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
              const findAsset = assetData.find(({ id }: { id: string }) => (id === alert?.resource))
              // console.log("findAsset", findAsset)
              const text = alert?.text;
              console.log(text, "alert text here");
              const containsString = text.includes("http://www.industry-fusion.org/fields#noise");
              console.log("containsString", containsString);
              
              let updatedText;
              if(text && text.includes("http://www.industry-fusion.org/fields#noise")){
                const regex = /Value.*$/;
                const match = text.match(regex);
                if(match){
                  updatedText = "Property #noise : " + match[0] ;
                }              
            }
              else{
                updatedText = text;
              }
              
              console.log(updatedText, "updatedText here");
              

              console.log("alert", alert);

              return (
                <>
                  <div key={index} className="alerts-container card mb-4">
                    <div className="flex gap-3  ">
                      <div className="mt-2">
                        <i className={getIcon(alert?.severity).icon} style={{ fontSize: '1.3rem', color: getIcon(alert?.severity).color}}></i>
                      </div>
                      <div>
                        <div className="flex align-center">
                          {/* <p className="font-medium">Product name: </p> */}
                          <p className="ml-2 mb-0"
                            style={{
                              fontStyle: 'italic',
                              color: "#d5d5d5",
                              fontSize: "15px"
                            }}
                          >{findAsset?.product_name} - {findAsset?.id}  </p>
                        </div>
                        <div className="flex align-center">                     
                          <p className="ml-2 alert-type-text mb-0"> {alert?.type}</p>
                        </div>
                        <div className="flex align-center">                     
                          <p className="ml-2 alert-text mb-0 ">{updatedText}</p>
                        </div>
                        <div className="flex align-center">                     
                          <div className="flex gap-7">
                          <p className="ml-2 alert-time mt-2"> {alert?.updateTime}</p>
                          <p className="ml-2 mt-2 px-1 "
                          style={{color: getStatusTextColor(alert?.status),
                            border: `1px solid ${getStatusTextColor(alert?.status)}`,
                            borderRadius: "4px"
                          }}
                          > {alert?.status}</p>
                          <p className="ml-2 mt-2"
                          style={{color:"#9b9797"}}
                          >{alert?.previousSeverity}</p>
                          </div>                         
                        </div>
                        <div className="flex align-center">
                        <div className="flex " style={{gap:"10rem"}}>
                        <p className="ml-2 "> {findAsset?.asset_category}</p>
                        <p>{alert?.origin}</p>
                          </div>
                         
                        </div>
                      </div>
                    </div>
                    {/* <div className="flex align-center">
                      <p className="font-medium">Last Receive Time: </p>
                      <p className="ml-2 ">  {alert?.lastReceiveTime}</p>
                    </div> */}


                    {/* <div className="flex align-center">
                      <p className="font-medium">Previous Severity: </p>
                      <p className="ml-2 "> {alert?.previousSeverity}</p>
                    </div>
                    <div className="flex align-center">
                      <p className="font-medium">Resource: </p>
                      <p className="ml-2 ">{alert?.resource} </p>
                    </div> */}
                    {/* <div className="flex align-center">
                      <p className="font-medium">Severity: </p>                    
                      <p className="ml-2 "> {alert?.severity}</p>
                    </div> */}

                    {/* <div className="flex align-center">
                      <p className="font-medium">Repeat: </p>
                      <p className="ml-2 ">{alert?.repeat ? "true" : "false"} </p>
                    </div> */}
                    {/* <div className="flex align-center">
                      <p className="font-medium">Origin: </p>
                      <p className="ml-2 "> {alert?.origin}</p>
                    </div> */}
                    <div className='alert-btn'>
                      <Button
                      className="alert-btn-text" 
                      label="Acknowledge"
                      severity="warning"
                      />
                    </div>
                  </div>
                  
                </>
              )
            }
            )
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