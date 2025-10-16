
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import Image from "next/image";
import "@/styles/sync-dialog.css";
import ExpandableSerialNumbers from "./expand-product";
import { Trans, useTranslation } from "next-i18next";

interface ImportResponseData {
  modelpassedCount: number;
  productPassedCount: number;
  modelFailedCount?: number;
  productFailedCount?: number;
  modelFailedLogs: Record<string, string>;
  productFailedLogs: Record<string, Record<string, string>>;
}

interface SyncPdtDialogProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  onSync?: () => Promise<ImportResponseData>;
}

const SyncPdtDialog: React.FC<SyncPdtDialogProps> = ({
  visible,
  setVisible,
  onSync,
}) => {
  const {t} = useTranslation("overview")
  const [step, setStep] = useState<number>(1);
  const [startProgress, setStartProgress] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [showLog, setShowLog] = useState<boolean>(false);

  const productCount = 50; 
  const modelCount = 5; 
  const syncDone = startProgress && processedCount >= productCount;

  const [localImportData, setLocalImportData] = useState<ImportResponseData>({
    modelpassedCount: 0,
    productPassedCount: 0,
    modelFailedCount: 0,
    productFailedCount: 0,
    modelFailedLogs: {},
    productFailedLogs: {},
  });

  const selectedModels = [
    { product_name: "minuscheck" },
    { product_name: "whynotworking" },
    { product_name: "creating cooler" },
    { product_name: "certingagain" },
    { product_name: "whycertnotcoming" },
    { product_name: "bddssecretcheck" },
    { product_name: "another plasma from dpp" },
    { product_name: "creating cutting machines again" },
    { product_name: "for show purpose" },
    { product_name: "clone for message" },
  ];

  useEffect(() => {
    if (!startProgress) return;
    const timer = setInterval(() => {
      setProcessedCount((prev) => {
        if (prev >= productCount) {
          clearInterval(timer);
          return productCount;
        }
        return prev + 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [startProgress]);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setStartProgress(false);
      setProcessedCount(0);
      setShowLog(false);
    }
  }, [visible]);

  const handleStartSync = async () => {
    setStep(2);
    setStartProgress(true);
    if (onSync) {
      try {
        const result = await onSync();
        setLocalImportData(result);
      } catch (error) {
        console.error("Sync PDT failed:", error);
      }
    }
  };

  const handleClose = () => {
    setVisible(false);
    setStep(1);
    setStartProgress(false);
    setProcessedCount(0);
    setShowLog(false);
    setLocalImportData({
      modelpassedCount: 0,
      productPassedCount: 0,
      modelFailedCount: 0,
      productFailedCount: 0,
      modelFailedLogs: {},
      productFailedLogs: {},
    });
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
          />
          <Button
            className="global-button"
            icon={() => (
              <img src="/save_icon.svg" width={16} height={16} alt="Save" />
            )}
            label={t("start_sync")}
            onClick={handleStartSync}
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
            disabled={processedCount < productCount}
          />
          <Button
            className="global-button"
            icon={() => (
              <img src="/save_icon.svg" width={16} height={16} alt="Save" />
            )}
            label={t("done")}
            onClick={handleClose}
            disabled={processedCount < productCount}
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
      {step === 1 ? (
        <div className="flex flex-column gap-3">
          <div>
            <Trans
              i18nKey="overview:sync_dialog.message"
              values={{ modelCount, productCount }}
              components={{ strong: <strong className="blue_text_highlight" /> }}
            />
          </div>

          <div className="flex align-items-stretch gap-4">
            <div className="import_fp_badge flex align-items-center">
              <img
                src="/fp_circular_logo.svg"
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
                <div>{modelCount} {t("sync_dialog.product_models")}</div>
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
                src="/import_ifx_logo.svg"
                width={215}
                height={48}
                alt="IFX Logo"
              />
            </div>
          </div>
 
          <ExpandableSerialNumbers
            products={selectedModels} 
            activeTab="Active"
          />
          <div>
            {t("sync_dialog.continue_text")}
          </div>
        </div>
      ) : (
        <div className="flex flex-column gap-2 align-items-center">
          <div className="import_dialog_heading">
            {!syncDone ? t("sync_dialog.importing") : t("sync_dialog.import_finished")}
          </div>

          {!syncDone ? (
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
                  <strong>{localImportData.modelpassedCount}</strong> {t("sync_dialog.product_model")}
                </div>
                <div>
                  <strong>{localImportData.productPassedCount}</strong> {t("sync_dialog.products")}
                </div>
                <div>
                  <strong>
                    {(localImportData.modelFailedCount ?? 0) +
                      (localImportData.productFailedCount ?? 0)}
                  </strong>{" "}
                  {t("sync_dialog.errors")}
                </div>
              </div>

              <div
                className={`import_log_wrapper ${showLog ? "log_active" : ""}`}
              >
                <div className="flex flex-column gap-2">
                  <div className="log_details_title">
                    <strong>{localImportData.modelFailedCount ?? 0}</strong> {t("sync_dialog.model_errors")}
                  </div>
                  {Object.keys(localImportData.modelFailedLogs).length > 0 &&
                    Object.entries(localImportData.modelFailedLogs).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="log_details_cell flex align-items-center justify-content-between gap-4"
                        >
                          <div className="log_details_cell flex align-items-center gap-2">
                            <Image
                              src="/industryFusion_icon-removebg-preview.png"
                              draggable={false}
                              width={28}
                              height={28}
                              alt="product model"
                              className="log_details_cell_image"
                            />
                            <div>{key}</div>
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
                            tooltip={value}
                            tooltipOptions={{ position: "bottom" }}
                          />
                        </div>
                      )
                    )}
                </div>

                {Object.keys(localImportData.productFailedLogs).length > 0 && (
                  <div className="flex flex-column gap-2 mt-3">
                    <div className="log_details_title">
                      <strong>{localImportData.productFailedCount ?? 0}</strong> {t("sync_dialog.product_errors")}
                    </div>
                    {Object.entries(localImportData.productFailedLogs).map(
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
    </Dialog>
  );
};

export default SyncPdtDialog;
