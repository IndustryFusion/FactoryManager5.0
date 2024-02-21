import React, { Dispatch, SetStateAction, useState } from "react";
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Avatar } from "primereact/avatar";
import "../../app/globals.css"

interface AlertDetailsProps {
  alerts: Alerts[];
  count: number;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  assetData: Asset;
}

interface Asset {
  id: string;
  product_name: string;
  asset_category: string;
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
    switch (severity) {
      default:
      case 'ok':
      case 'warning':
        return 'pi pi-info-circle';
      case 'machine-warning':
        return 'pi pi-exclamation-triangle';
      case 'machine-error':
        return 'pi pi-times';
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
            alerts.map((alert, index) => (
              <>
                <div key={index} className="alerts-container">
                  <div className="flex align-center">
                    <p className="font-medium">Last Receive Time: </p>
                    <p className="ml-2 ">  {alert?.lastReceiveTime}</p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Previous Severity: </p>
                    <p className="ml-2 "> {alert?.previousSeverity}</p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Resource: </p>
                    <p className="ml-2 ">{alert?.resource} </p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Severity: </p>
                    <p className="ml-2 "> {alert?.severity}</p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Status: </p>
                    <p className="ml-2 "> {alert?.status}</p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Text: </p>
                    <p className="ml-2 ">{alert?.text}</p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Repeat: </p>
                    <p className="ml-2 ">{alert?.repeat ? "true" : "false"} </p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Origin: </p>
                    <p className="ml-2 "> {alert?.origin}</p>
                  </div>
                </div>
                <div className="alerts-container">
                  <div className="flex align-center">
                    <p className="font-medium">URN ID: </p>
                    <p className="ml-2 ">{assetData?.id} </p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Product name: </p>
                    <p className="ml-2 ">{assetData?.product_name} </p>
                  </div>
                  <div className="flex align-center">
                    <p className="font-medium">Asset Category:  </p>
                    <p className="ml-2 "> {assetData?.asset_category}</p>
                  </div>
                </div>
                <Divider />
              </>
            ))
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