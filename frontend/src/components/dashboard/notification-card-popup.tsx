import { useDashboard } from "@/context/dashboard-context";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getAlerts } from "../alert/alert-service";

interface NotificationPopupProps {
  notificationProp: boolean;
  setNotificationProp: Dispatch<SetStateAction<boolean>>;

}

const NotificationDialog: React.FC<NotificationPopupProps> = ({ notificationProp, setNotificationProp }) => {
  const { entityIdValue } = useDashboard();
  const [alerts, setAlerts] = useState([]);
  console.log(entityIdValue, "assetId , notifications");

  useEffect(() => {
    const fetchAllAlerts = async () => {
      try {
        const response = await getAlerts();
        // console.log(response, "akert");
        setAlerts(response.alerts);
        console.log(response.alerts, "alerts response");

      } catch (error) {
        console.error(error)
      }
    }
    fetchAllAlerts();
  }, [])


  const notification = alerts.filter(({ resource }) => resource === entityIdValue);


  return (
    <>
      <Dialog header="Notifications" visible={notificationProp} style={{ width: '50vw' }} onHide={() => setNotificationProp(false)}>
        <div className="alerts-container">
          <div className="flex align-center">
            <p className="font-medium">Last Receive Time: </p>
            <p className="ml-2 ">  {notification?.lastReceiveTime}</p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Previous Severity: </p>
            <p className="ml-2 "> {notification?.previousSeverity}</p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Resource: </p>
            <p className="ml-2 ">{notification?.resource} </p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Severity: </p>
            <p className="ml-2 "> {notification?.severity}</p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Status: </p>
            <p className="ml-2 "> {notification?.status}</p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Text: </p>
            <p className="ml-2 ">{notification?.text}</p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Repeat: </p>
            <p className="ml-2 ">{notification?.repeat ? "true" : "false"} </p>
          </div>
          <div className="flex align-center">
            <p className="font-medium">Origin: </p>
            <p className="ml-2 "> {notification?.origin}</p>
          </div>
        </div>

      </Dialog>
    </>
  )
}

export default NotificationDialog;