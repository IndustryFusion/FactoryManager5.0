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

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Dialog } from 'primereact/dialog';
import { Avatar } from "primereact/avatar";
import "../../app/globals.css"
import "../../styles/asset-list.css"
import { Button } from "primereact/button";
import { useTranslation } from "next-i18next";
import { Asset } from "@/types/asset-types";
import { Panel } from "primereact/panel";
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { Job } from "./job-service";
import { ScrollPanel } from 'primereact/scrollpanel';


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
  jobs: Job[];
  alertsCount: number;
  jobsCount: number;
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

const AlertDetails: React.FC<AlertDetailsProps> = ({ alerts, jobs, alertsCount, jobsCount, visible, setVisible, assetData, handleAcknowledge }) => {
  const { t } = useTranslation(['button', 'navigation']);
  const [selected, setSelected] = useState<AlertaState | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [logsVisible, setLogsVisible] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logsCache, setLogsCache] = useState<Record<string, string>>({});
  const eventSourceRef = useRef<EventSource | null>(null);

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

  const handleJobClick = (job: Job) => {
    console.log('Opening logs for job:', job.jobId);
    setSelectedJob(job);
    setLogsVisible(true);
    
    // Check if logs are already cached
    if (logsCache[job.jobId]) {
      console.log('Using cached logs for job:', job.jobId);
      setLogs(logsCache[job.jobId]);
      setIsLoadingLogs(false);
    } else {
      console.log('Fetching logs for job:', job.jobId);
      setLogs('Loading logs...\n');
      
      // For completed jobs, use simple HTTP fetch instead of SSE
      if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
        fetchJobLogsHttp(job.jobId);
      } else {
        streamJobLogs(job.jobId);
      }
    }
  };

  const fetchJobLogsHttp = async (jobId: string) => {
    setIsLoadingLogs(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      const response = await fetch(`${API_URL}/jobs/${jobId}/logs-text`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const logsText = await response.text();
        const finalLogs = logsText + '\n[Logs loaded successfully]\n';
        setLogs(finalLogs);
        
        // Cache the logs
        setLogsCache(prev => ({
          ...prev,
          [jobId]: finalLogs
        }));
      } else {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs('Failed to load logs. Using SSE stream instead...\n');
      streamJobLogs(jobId);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const streamJobLogs = (jobId: string) => {
    setIsLoadingLogs(true);
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const eventSource = new EventSource(`${API_URL}/jobs/${jobId}/stream`, {
      withCredentials: true
    });
    
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('EventSource connection opened');
      setIsLoadingLogs(false);
      
      // Set a timeout to provide feedback if no logs come through
      setTimeout(() => {
        setLogs(prevLogs => {
          if (prevLogs === 'Connecting to log stream...\n') {
            return prevLogs + '\n[Connected to log stream, waiting for logs...]\n' +
                   '[Note: Logs will appear here as the job runs]\n' +
                   '[Current Job Status: ' + (selectedJob?.status || 'Unknown') + ']\n\n';
          }
          return prevLogs;
        });
      }, 2000);
    };

    eventSource.onmessage = (event) => {
      console.log('Received SSE event:', event);
      
      // Handle different event data formats
      let logData = event.data;
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(event.data);
        console.log('Parsed JSON data:', parsed);
        
        // Handle different JSON structures
        if (parsed.log) {
          logData = parsed.log;
        } else if (parsed.message) {
          logData = parsed.message;
        } else if (parsed.data) {
          logData = parsed.data;
        } else if (typeof parsed === 'string') {
          logData = parsed;
        } else {
          logData = JSON.stringify(parsed, null, 2);
        }
      } catch (error) {
        // If it's not JSON, use as is
        console.log('Using raw event data:', logData);
      }
      
      if (logData && logData.trim()) {
        setLogs(prevLogs => {
          const newLogs = prevLogs + logData + '\n';
          // Cache the logs when we receive the end marker
          if (logData.includes('Log stream ended')) {
            setLogsCache(prev => ({
              ...prev,
              [selectedJob?.jobId || '']: newLogs
            }));
          }
          return newLogs;
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      setIsLoadingLogs(false);
      
      // Close the connection to prevent auto-reconnection
      eventSource.close();
      eventSourceRef.current = null;
      
      // Check if logs were received (indicating successful completion vs actual error)
      setLogs(prevLogs => {
        const finalLogs = prevLogs.includes('Job completed successfully') || prevLogs.includes('started')
          ? prevLogs + '\n[Log stream ended - Job processing complete]\n'
          : prevLogs + '\n[Connection error or no logs available from runner service]\n';
        
        // Cache the final logs
        if (selectedJob?.jobId) {
          setLogsCache(prev => ({
            ...prev,
            [selectedJob.jobId]: finalLogs
          }));
        }
        
        return finalLogs;
      });
    };

    // Handle other event types if they exist
    eventSource.addEventListener('log', (event: any) => {
      console.log('Received log event:', event);
      if (event.data) {
        setLogs(prevLogs => prevLogs + event.data + '\n');
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      console.log('Received error event:', event);
      if (event.data) {
        setLogs(prevLogs => prevLogs + '[ERROR] ' + event.data + '\n');
      }
    });
  };

  const closeLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLogsVisible(false);
    setSelectedJob(null);
    setLogs('');
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return {
          icon: 'pi pi-clock',
          color: "#ffc107"
        };
      case 'RUNNING':
        return {
          icon: 'pi pi-play-circle',
          color: "#007bff"
        };
      case 'SUCCEEDED':
        return {
          icon: 'pi pi-check-circle',
          color: "#04c904"
        };
      case 'FAILED':
        return {
          icon: 'pi pi-times-circle',
          color: "#ff0000"
        };
      default:
        return { icon: 'pi pi-question', color: '#6c757d' };
    }
  };

  const renderJobsList = () => {
    if (jobsCount === 0) {
      return (
        <div className="notification mt-2 notification--empty flex flex-row gap-3 items-center">
          <Avatar icon="pi pi-inbox" shape="circle"></Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold" style={{ paddingTop: "5px" }}>
              {t("navigation:navbar.no_jobs")}
            </span>
          </div>
        </div>
      );
    }

    return jobs.slice(0, 20).map((job, index) => (
      <div key={index} className="alerts-container card mb-4" style={{ borderBottom: "1px solid #e0e0e0", marginTop: "0px" }}>
        <div className="alert-content">
          <div className="asset-first-content">
            <div className="asset-first-left">
              <i
                className={getJobStatusIcon(job.status).icon}
                style={{
                  fontSize: "1.3rem",
                  color: getJobStatusIcon(job.status).color
                }}
              ></i>
              <span className="asset-warning">Job {job.jobId}</span>
            </div>
            <div className="asset-time">{new Date(job.updatedAt).toLocaleString()}</div>
          </div>

          <div className="asset-second-content">
            <Panel 
              className="alert-panel" 
              onClick={() => handleJobClick(job)}
              style={{ cursor: 'pointer' }}
            >
              <div className="product-panel-header flex align-items-center justify-content-between width-full">
                <div className="flex align-items-center gap-3">
                  <img
                    src="/workflow-square.svg"
                    alt="job"
                    className="product-image"
                    onError={(e) =>
                      (e.currentTarget.src = "/avatar.svg")
                    }
                  />
                  <div className="flex flex-column gap-1">
                    <span className="alert-product-name">
                      Flink Job
                    </span>
                    <span className="alert-factory-name">
                      <span className="alert-factory-sub-name">
                        Job ID -{" "}
                      </span>
                      {job.jobId}
                    </span>
                    <span className="alert-factory-name">
                      <span className="alert-factory-sub-name">
                        Status -{" "}
                      </span>
                      <span
                        style={{
                          color: getJobStatusIcon(job.status).color,
                          fontWeight: 'bold'
                        }}
                      >
                        {job.status}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="alert-details-content" style={{ marginTop: '12px' }}>
                <div className="alert-detail-item">
                  <label className="alert-label">Knowledge URL</label>
                  <span className="alert-value">
                    {job.knowledgeUrl || "N/A"}
                  </span>
                </div>

                <div className="alert-detail-grid">
                  <div className="alert-detail-item">
                    <label className="alert-label">SHACL URL</label>
                    <span className="alert-value">
                      {job.shaclUrl || "N/A"}
                    </span>
                  </div>

                  <div className="alert-detail-item">
                    <label className="alert-label">Created</label>
                    <span className="alert-value">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    ));
  };

  const renderAlertsList = () => {
    if (alertsCount === 0) {
      return (
        <div className="notification mt-2 notification--empty flex flex-row gap-3 items-center">
          <Avatar icon="pi pi-inbox" shape="circle"></Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold" style={{ paddingTop: "5px" }}>
              {t("navigation:navbar.no_notifications")}
            </span>
          </div>
        </div>
      );
    }

    return alerts
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
                            (e.currentTarget.src = "/avatar.svg")
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
      .filter((component) => component !== null);
  };

  return (
    <Dialog
      contentClassName="alerts-details-content"
      headerClassName="alert-details-header"
      visible={visible}
      header={
        <div className="header-notification-container">
          <h3 className="asset-header-title">{t("navigation:navbar.notifications")}</h3>
          <p className="asset-header-sub-title">
            {t("navigation:navbar.all_notifications")}
            <span className="arrow-icon">
              <img src="/arrow-right-02.svg" alt="View All" />
            </span>
          </p>
        </div>
      }
      onHide={() => setVisible(false)}
      style={{ width: "40vw" }}
    >
      <TabView 
        activeIndex={activeIndex} 
        onTabChange={(e) => setActiveIndex(e.index)}
        style={{
          width: '100%'
        }}
        pt={{
          navContainer: {
            style: {
              justifyContent: 'center',
              borderBottom: '2px solid #e0e0e0',
              marginBottom: '1rem'
            }
          },
          nav: {
            style: {
              backgroundColor: 'transparent',
              border: 'none'
            }
          },
          inkbar: {
            style: {
              backgroundColor: '#007bff',
              height: '3px'
            }
          },
          navContent: {
            style: {
              padding: '0.75rem 1.5rem',
              fontWeight: '500',
              fontSize: '0.95rem'
            }
          }
        }}
      >
        <TabPanel header={`Alerts (${alertsCount})`}>
          {renderAlertsList()}
        </TabPanel>
        <TabPanel header={`Jobs (${jobsCount})`}>
          {renderJobsList()}
        </TabPanel>
      </TabView>

      {/* Job Logs Modal */}
      <Dialog
        visible={logsVisible}
        onHide={closeLogs}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-file-o" style={{ fontSize: '1.2rem' }}></i>
            <span>Logs</span>
            {selectedJob && (
              <span className="text-sm text-gray-500">- {selectedJob.jobId}</span>
            )}
          </div>
        }
        style={{ width: '70vw', height: '80vh' }}
        contentStyle={{ padding: '1rem', height: 'calc(80vh - 120px)' }}
        closable={true}
        modal={true}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {isLoadingLogs ? (
            <div className="flex justify-content-center align-items-center" style={{ height: '100%' }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : (
            <ScrollPanel 
              style={{ 
                width: '100%', 
                height: '100%'
              }}
              pt={{
                wrapper: {
                  style: {
                    borderRight: '1px solid #444'
                  }
                },
                barY: {
                  style: {
                    backgroundColor: '#555',
                    width: '8px',
                    borderRadius: '4px'
                  }
                },
                barX: {
                  style: {
                    backgroundColor: '#555',
                    height: '8px',
                    borderRadius: '4px'
                  }
                }
              }}
            >
              <pre 
                style={{ 
                  backgroundColor: '#1e1e1e',
                  color: '#ffffff',
                  padding: '1rem',
                  margin: 0,
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '100%',
                  overflow: 'visible'
                }}
              >
                {logs || 'No logs available yet...'}
              </pre>
            </ScrollPanel>
          )}
        </div>
      </Dialog>
    </Dialog>
  );
};

export default AlertDetails;