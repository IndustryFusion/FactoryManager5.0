//
// Single source of truth for Alerta alerts + Flink jobs.
//
// The bell in the navbar used to own this state privately. The dashboard's
// "Today's Notifications" card now shows the same alerts, and having it fetch
// independently would mean two 30s pollers hitting /alerts and /jobs — double
// the load, and two copies of the data that can drift out of sync, so the badge
// count and the dashboard list could disagree. One provider, one interval.
//
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from "react";
import axios from "axios";
import { useTranslation } from "next-i18next";
import { getAlerts } from "@/components/alert/alert-service";
import { getJobs, Job } from "@/components/alert/job-service";
import { Asset } from "@/types/asset-types";
import type { Alerts as Alert } from "@/components/alert/alert-details";
import { notifyError } from "@/utility/global-toast";
import { logHandledError } from "@/utility/log";
import { flatValue } from "@/utility/ngsi-links";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const POLL_MS = 30_000;

// Canonical alert shape lives with the component that consumes it most heavily,
// so the bell, the dashboard card and the details dialog all agree on one type.
export type { Alerts as Alert } from "@/components/alert/alert-details";

interface AlertsContextValue {
  alerts: Alert[];
  jobs: Job[];
  assetData: any[];
  alertsCount: number;
  jobsCount: number;
  loading: boolean;
  error: unknown | null;
  refresh: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const mapBackendDataToAssetState = (backendData: Asset) => {
  const modifiedObject: any = {};
  Object.keys(backendData).forEach((key) => {
    if (key.includes("/")) {
      const newKey = key.split("/").pop() || "";
      modifiedObject[newKey] =
        flatValue(backendData[key]);
    } else {
      modifiedObject[key] = backendData[key];
    }
  });
  return modifiedObject;
};

export const AlertsProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation(["toast"]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assetData, setAssetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  // Avoids a "toast storm": when the backend is down every poll would otherwise
  // raise the same notification every 30 seconds.
  const reportedRef = useRef(false);

  const fetchAssetData = useCallback(async (assetId: string) => {
    try {
      const response = await axios.get(API_URL + `/asset/get-asset-by-id/${assetId}`, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        withCredentials: true,
      });
      return mapBackendDataToAssetState(response.data);
    } catch (err) {
      logHandledError("Error fetching asset data", err);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [jobResponse, alertResponse] = await Promise.all([getJobs(), getAlerts()]);
      const nextAlerts: Alert[] = alertResponse?.alerts ?? [];
      setJobs(jobResponse?.jobs ?? []);
      setAlerts(nextAlerts);
      setAssetData(await Promise.all(nextAlerts.map((a) => fetchAssetData(a.resource))));
      setError(null);
      reportedRef.current = false;
    } catch (err) {
      setError(err);
      logHandledError("Error loading alerts", err);
      if (!reportedRef.current) {
        reportedRef.current = true;
        notifyError(t("toast:error"), err, t("toast:load_alert_data_failed"));
      }
    } finally {
      setLoading(false);
    }
  }, [fetchAssetData, t]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo<AlertsContextValue>(
    () => ({
      alerts, jobs, assetData,
      alertsCount: alerts.length,
      jobsCount: jobs.length,
      loading, error, refresh,
    }),
    [alerts, jobs, assetData, loading, error, refresh],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
};

export const useAlerts = (): AlertsContextValue => {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within an AlertsProvider");
  return ctx;
};

/** Alerts whose lastReceiveTime falls on the current calendar day, newest first. */
export const useTodaysAlerts = (): Alert[] => {
  const { alerts } = useAlerts();
  return useMemo(() => {
    const now = new Date();
    return alerts
      .filter((a) => {
        const d = new Date(a.lastReceiveTime);
        return (
          !isNaN(d.getTime()) &&
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .sort(
        (a, b) =>
          new Date(b.lastReceiveTime).getTime() - new Date(a.lastReceiveTime).getTime(),
      );
  }, [alerts]);
};
