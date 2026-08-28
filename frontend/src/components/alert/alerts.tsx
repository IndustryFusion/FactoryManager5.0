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

import { useState } from "react";
import { postStatusForAlert } from "./alert-service";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import AlertDetails from "./alert-details";
import Image from "next/image";
import { useTranslation } from "next-i18next";
import { notifyError } from "@/utility/global-toast";
import { logHandledError } from "@/utility/log";
import { useAlerts } from "@/context/alerts-context";
const Alerts = () => {
  // Alerts/jobs come from the shared provider so the bell badge and the
  // dashboard's notification card always show the same data.
  const { alerts, jobs, assetData, alertsCount, jobsCount, refresh } = useAlerts();
  const [isAlert, setIsAlert] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const { t } = useTranslation(["navigation"]);

  const handleAcknowledge = async (id: string, status: string) => {
    try {
      const response = await postStatusForAlert(id, { status, text: 'Manual change.' });
      if (response.status === 'ok') {
        await refresh();   // re-pull shared state so bell and dashboard both update
      }
    } catch (error) {
      logHandledError("Error acknowledging alert:", error);
      notifyError(t('toast:action_failed'), error, t('toast:acknowledge_alert_failed'));
    }
  };


// CSS style for badge position and appearance
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-2px',
    right: '1px',
    fontSize: '0.2rem',
  };

  // Calculate total count for badge (alerts + jobs)
  const totalCount = alertsCount + jobsCount;

  return (
    <>
      <div style={{
        position: 'relative',
        display: 'inline-block',
        width: "40px",
      }}>
        <Button
          icon={<Image src="/navbar/alert_icon.svg" width={18} height={18} alt="Alerts Icon"/>}
          link
          className="nav_icon_button"
          onClick={() => {
            setIsAlert(true);
            setVisible(true)
          }}
          tooltip={t("navbar.alerts")}
          tooltipOptions={{ position: 'bottom' }}
          // style={{ fontFamily: "Segoe UI", fontSize: "14px", fontWeight: "bold", color: "#615e5e" }}
        />
        <div style={badgeStyle}>
          <Badge className={`p-badge ${totalCount > 5 ? "active" : ""}`} value={totalCount} />
        </div>
      </div>
      {isAlert &&
        <AlertDetails
          alertsCount={alertsCount}
          jobsCount={jobsCount}
          alerts={alerts}
          jobs={jobs}
          visible={visible}
          setVisible={setVisible}
          assetData={assetData}
          handleAcknowledge={handleAcknowledge}
        />
      }
    </>
  )
}

export default Alerts;