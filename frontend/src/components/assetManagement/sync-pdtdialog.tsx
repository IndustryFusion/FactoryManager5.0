
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import Image from "next/image";
import "@/styles/sync-dialog.css";
import ExpandableSerialNumbers from "./expand-product";
import { Trans, useTranslation } from "next-i18next";
import { getSyncPdtData } from "@/utility/asset";
import { getAccessGroup } from "@/utility/indexed-db";
import LoadingCircle from "@/components/loader/dialog-loader";

interface ImportResponseData {
  successCount: number;
  failureCount: number;
  logDetails: Record<string, string>;
}

interface SyncPdtDialogProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

const SyncPdtDialog: React.FC<SyncPdtDialogProps> = ({
  visible,
  setVisible,
}) => {
  const {t} = useTranslation("overview")
  const [step, setStep] = useState<number>(1);
  const [startProgress, setStartProgress] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [showLog, setShowLog] = useState<boolean>(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productCount, setProductCount] = useState<number>(0);
  const [ isSyncDone, setIsSyncDone ] = useState<boolean>(false);

  const [localImportData, setLocalImportData] = useState<ImportResponseData>({
    successCount: 0,
    failureCount: 0,
    logDetails: {},
  });

  const fetchSelectedProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getAccessGroup();
      const response = await getSyncPdtData(data.company_ifric_id);
      setSelectedProducts(response);
    } catch(error) {
      console.error("fetch Sync PDT failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (visible) {
      fetchSelectedProducts();
      setStep(1);
      setStartProgress(false);
      setProcessedCount(0);
      setShowLog(false);
    }
  }, [visible]);

  const handleStartSync = async () => {
    setStep(2);
    setStartProgress(true);
    try {
      const indexedDbData = await getAccessGroup();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/company/sync-pdt/${indexedDbData.company_ifric_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${indexedDbData?.ifricdi}`,
            "Content-Type": "application/json",
            Accept: "application/x-ndjson",
          },
          credentials: "include",
        }
      );
      const reader = response?.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
  
        let lines = buffer.split("\n");
        buffer = lines.pop(); 
  
        for (const line of lines) {
          const parsed = JSON.parse(line);
          console.log("NDJSON message:", parsed);
  
          // only set sync done when response has status as its final response.
          if ("status" in parsed) {
            setIsSyncDone(true);
            setLocalImportData({
              successCount: parsed.data.successCount,
              failureCount: parsed.data.failureCount,
              logDetails: parsed.data.logDetails
            });
          } else {
            setProcessedCount(parsed.processed);
            setProductCount(parsed.total);
          }
        }
      }
    } catch (error) {
      console.error("Sync PDT failed:", error);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setStep(1);
    setStartProgress(false);
    setProcessedCount(0);
    setShowLog(false);
    setLocalImportData({
      successCount: 0,
      failureCount: 0,
      logDetails: {}
    });
    setIsSyncDone(false);
  };

  const footerContent = (
    <div className="flex justify-content-end gap-3 mt-2">
      {step === 1 ? (
        <>
          <Button
            className="global-button is-grey"
            icon={() => (
              <img src="/cancel-circle.svg" width={16} height={16} alt="Cancel" />
            )}
            label={t("cancel")}
            onClick={handleClose}
            disabled={isLoading}
          />
          <Button
            className="global-button"
            icon={() => (
              <img src="/save_icon.svg" width={16} height={16} alt="Save" />
            )}
            label={t("start_sync")}
            onClick={handleStartSync}
            disabled={isLoading}
          />
        </>
      ) : (
        <>
          <Button
            className="global-button is-grey"
            icon={() => (
              <img src="/cancel-circle.svg" width={16} height={16} alt="Cancel" />
            )}
            label={t("view_logs")}
            onClick={() => setShowLog(true)}
          />
          <Button
            className="global-button"
            icon={() => (
              <img src="/save_icon.svg" width={16} height={16} alt="Save" />
            )}
            label={t("done")}
            onClick={handleClose}
          />
        </>
      )}
    </div>
  );

  return (
    <Dialog
      header={t("sync_dialog.dialog_title")}
      className="sync_dialog"
      visible={visible}
      onHide={handleClose}
      modal
      style={{ width: "100vw", maxWidth: "640px" }}
      footer={footerContent}
      closable={false}
      draggable={false}
    >
      <div>
        {
          isLoading ? 
            <LoadingCircle />
          :
          <div>
            {step === 1 ? (
              <div className="flex flex-column gap-3">
                <div>
                  <Trans
                    i18nKey="overview:sync_dialog.message"
                    values={{ productCount: selectedProducts.length}}
                    components={{ strong: <strong className="blue_text_highlight" /> }}
                  />
                </div>

                <div className="flex align-items-stretch gap-4">
                  <div className="import_fp_badge flex align-items-center">
                    <img
                      src="/IF-X-logo.svg"
                      width={48}
                      height={48}
                      alt="fp_logo"
                      draggable={false}
                    />
                    <div className="flex align-items-center">
                      <img
                        src="/import_model_icon.svg"
                        draggable={false}
                        width={24}
                        height={24}
                        alt="product model"
                      />
                      <div>{selectedProducts.length} {t("sync_dialog.products")}</div>
                    </div>
                  </div>

                  <img
                    src="/import_grey_arrow.svg"
                    style={{ alignSelf: "center" }}
                    width={24}
                    height={24}
                    alt="Arrow"
                  />

                  <div className="import_fp_badge flex align-items-center">
                    <img
                      src="/sidebar/logo_expanded.svg"
                      width={215}
                      height={48}
                      alt="IFX Logo"
                    />
                  </div>
                </div>
      
                <ExpandableSerialNumbers
                  products={selectedProducts} 
                  activeTab="Active"
                />
                <div>
                  {t("sync_dialog.continue_text")}
                </div>
              </div>
            ) : (
              <div className="flex flex-column gap-2 align-items-center">
                <div className="import_dialog_heading">
                  {!isSyncDone ? t("sync_dialog.syncing") : t("sync_dialog.sync_finished")}
                </div>

                {!isSyncDone ? (
                  <div className="import-progress-bar">
                    <div className="import_progressbar_track">
                      <ProgressBar
                        className="import_progressbar"
                        value={(processedCount / productCount) * 100}
                        displayValueTemplate={() => null}
                      />
                      <div className="progress_percent">
                        {(productCount > 0
                          ? (processedCount / productCount) * 100
                          : 0
                        ).toFixed(0)}
                        %
                      </div>
                    </div>
                    <div className="blue_text_highlight text-center mt-2">
                      {t("sync_dialog.syncing_models")}
                    </div>
                  </div>
                ) : (
                  <div className="import_summary_block">
                    <div className="flex align-items-center gap-4 import_summary_header">
                      <div>
                        <strong>{localImportData.successCount}</strong> {t("sync_dialog.products")}
                      </div>
                      <div>
                        <strong>
                          {(localImportData.failureCount ?? 0)}
                        </strong>{" "}
                        {t("sync_dialog.errors")}
                      </div>
                    </div>

                    <div
                      className={`import_log_wrapper ${showLog ? "log_active" : ""}`}
                    >

                      {localImportData.failureCount > 0 && (
                        <div className="flex flex-column gap-2 mt-3">
                          <div className="log_details_title">
                            <strong>{localImportData.failureCount ?? 0}</strong> {t("sync_dialog.product_errors")}
                          </div>
                          {Object.entries(localImportData.logDetails).map(
                            ([modelName, productErrors]) => (
                              <div key={modelName} className="log_details_product_block">
                                <div className="flex align-items-center gap-2 mb-1">
                                  <Image
                                    src="/import_model_icon.svg"
                                    width={20}
                                    height={20}
                                    alt="Product Model"
                                  />
                                  <strong>{modelName}</strong>
                                </div>
                                {Object.entries(productErrors).map(
                                  ([productName, reason]) => (
                                    <div
                                      key={productName}
                                      className="log_details_cell flex align-items-center justify-content-between gap-4"
                                    >
                                      <div className="log_details_cell flex align-items-center gap-2">
                                        <Image
                                          src="/industryFusion_icon-removebg-preview.png"
                                          draggable={false}
                                          width={24}
                                          height={24}
                                          alt="product"
                                          className="log_details_cell_image"
                                        />
                                        <div>{productName}</div>
                                      </div>
                                      <Button
                                        style={{
                                          cursor: "auto",
                                          flexShrink: "0",
                                          background: "transparent",
                                          padding: "0px",
                                          border: "0px",
                                          outline: "0px",
                                        }}
                                        tooltip={reason}
                                        tooltipOptions={{ position: "bottom" }}                                 
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-content-center">
                      <Button
                        onClick={() => setShowLog(!showLog)}
                        className="global-button is-link"
                        icon={
                          <Image
                            src="/dropdown-icon-blue.svg"
                            width={16}
                            height={16}
                            alt="Show summary"
                            className={showLog ? "rotate-180" : ""}
                          />
                        }
                        label={showLog ? t("sync_dialog.hide") : t("sync_dialog.show")}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      </div>
      
    </Dialog>
  );
};

export default SyncPdtDialog;
