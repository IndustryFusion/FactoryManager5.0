import { useDashboard } from "@/context/dashboard-context";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getAlerts } from "../alert/alert-service";


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
  const { entityIdValue } = useDashboard();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const notificationData = alerts.filter(({ resource }) => resource === entityIdValue);

  return (
    <>
      <Dialog
        header={notificationData.length > 0 ? "Notifications" : "No Notifications"}

        visible={notificationProp} style={{ width: '50vw' }} onHide={() => setNotificationProp(false)}>
        <div className="alerts-container">

          {notificationData.length > 0 ?
            notificationData.map((notification: Notification, index) => (
              <div key={index}>
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
            ))
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