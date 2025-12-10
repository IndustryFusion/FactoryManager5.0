import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Sidebar from '@/components/navBar/sidebar';
import Navbar from '@/components/navBar/navbar';
import Footer from '@/components/navBar/footer';
import { TabView, TabPanel } from 'primereact/tabview';
import AssetManagement from '@/components/assetManagement/asset-management-new';
import AllocatedAsset from '@/components/assetManagement/allocated-asset';
import '@/styles/factory-card.css';
import '@/styles/factory-overview.css';
import '@/styles/asset-management/asset-management-page.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllocatedAssetsAsync, fetchAssets, setActiveTabIndex } from '@/redux/assetManagement/assetManagementSlice';
import { RootState } from '@/redux/store';
import SyncPdtDialog from '@/components/assetManagement/sync-pdtdialog';
import { Button } from 'primereact/button';
import { getAccessGroup } from '@/utility/indexed-db';
import { OverlayPanel } from 'primereact/overlaypanel';
import { getSyncPdtCount } from '@/utility/asset';
import { Badge } from "primereact/badge";

interface ImportResponseData {
  modelpassedCount: number;
  productPassedCount: number;
  modelFailedCount?: number;
  productFailedCount?: number;
  modelFailedLogs: Record<string, string>;
  productFailedLogs: Record<string, Record<string, string>>;
}

const AssetManagementPage = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const dispatch = useDispatch();
  const activeIndex = useSelector((state: RootState) => state.assetManagement.activeTabIndex);
  const { assets } = useSelector((state: RootState) => state.assetManagement);
  const { t } = useTranslation(['common', 'button', 'overview']);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [importResponseData, setImportResponseData] = useState<ImportResponseData | null>(null);
  const [accessgroupIndexDb, setAccessgroupIndexedDb] = useState<any>(null);
  const [searchInput,setSearchInput]=useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");   
  const [productTypeFilter, setProductTypeFilter] = useState<string[]>([]);
  const [selectedGroupOption, setSelectedGroupOption] = useState<string | null>(null);
  const opFilter = useRef(null);
  const opGroup = useRef(null);
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [syncPdtCount, setSyncPdtCount] = useState<number>(0);

  useEffect(() => {
    const initializeData = async () => {
      if (!dataInitialized) {
        try {
          await Promise.all([
            dispatch(fetchAssets()),
            dispatch(fetchAllocatedAssetsAsync())
          ]);
          setDataInitialized(true);
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      }
    };

    initializeData();
  }, [dispatch, dataInitialized]);

  const handleTabChange = (e) => {
    dispatch(setActiveTabIndex(e.index));
  };

  const handleDialogOpen = () => setDialogVisible(true);
  // const handleDialogClose = () => setDialogVisible(false);

  const handleSyncPdt = async (): Promise<ImportResponseData> => {
    const response: ImportResponseData = {
      modelpassedCount: 5,
      productPassedCount: 50,
      modelFailedCount: 1,
      productFailedCount: 2,
      modelFailedLogs: { "Model X": "Failed due to missing fields" },
      productFailedLogs: {
        "Product A": { "Product 123": "Error in configuration" },
        "Product B": { "Product 456": "Invalid data format" },
      },
    };
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setImportResponseData(response);
    return response;
  };

  useEffect(() => {
    const fetchAccessGroup = async () => {
      try {
        const data = await getAccessGroup();
        setAccessgroupIndexedDb(data);

        // fetch sync pdt count
        const response = await getSyncPdtCount(data.company_ifric_id);
        setSyncPdtCount(response.assetsWithUpdates);
      } catch(error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchAccessGroup();
  }, []);

  const productTypes = [...new Set(
    assets
      .map(a => a.type?.split('/').pop())
      .filter((t): t is string => !!t)
  )];


  const toggleProductType = (type: string) => {
    setProductTypeFilter(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGroupSelection = (option: string) => {
    setSelectedGroupOption(prev => (prev === option ? null : option));
  };


  return (
    <div className="flex">
      <Sidebar selectedItem="Assets" />
      <div className='main_content_wrapper'>
        <div className='navbar_wrapper'>
          <Navbar navHeader={t("overview:Assets")} />
        </div>

        <div className="dashboard-container">
          <div className="grid py-1 px-2 factory-overview">
            <div className="col-12">
              <div className="asset-header flex justify-content-between align-items-center">
                <div className="flex align-items-center gap-4">
                  <p className="total-assets-text m-1">
                    <span className="highlighted-number">{assets.length}</span> {t("overview:Assets")}
                  </p>
                  <div>
                    <TabView activeIndex={activeIndex} onTabChange={handleTabChange} className="asset-tabs">
                      <TabPanel header={t("overview:asset_table")}></TabPanel>
                      <TabPanel header={t("overview:allocated_assets")}></TabPanel>
                    </TabView>
                  </div>
                </div>
                <div style={{
                  position: 'relative',
                  display: 'inline-block'
                }}>
                  <Button
                    className="asset-btn-white"
                    onClick={() => { handleDialogOpen(); }}
                    disabled={!accessgroupIndexDb?.access_group?.create}
                    tooltip={t("overview:access_permission")}
                    tooltipOptions={{ position: "bottom", showOnDisabled: true, disabled: accessgroupIndexDb?.access_group.create === true }}
                  >
                    {t('overview:sync_pdt')}
                    <img src="/download_icon.svg" alt="plus icon" width={20} height={20} />
                  </Button>
                  {syncPdtCount > 0 && 
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      fontSize: '0.2rem',
                    }}>
                      <Badge className="sync-pdt-count" value={syncPdtCount} ></Badge>
                    </div>
                  }
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="search-content">
          <div className="toolbar-right">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: 8,
                border: "2px solid #F2F4F7",
                background: "#FFF",
                paddingLeft: "12px"
              }}
            >
              <img
                src="/search_icon.svg"
                alt="Search"
                className="search-icon"
              />
              <input
                type="text"
                placeholder={t("overview:search")}
                className="search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="toolbar-right">
            <div
              className={`toolbar-item filter-dropdown ${productTypeFilter.length > 0 ? "filter-active" : ""
                }`}
              onClick={(e) => opFilter.current.toggle(e)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex align-items-center gap-2">

                <img src="/Sort.svg" alt="Filter" className="search-img-container" />
                <span>{t("overview:filter")}</span>
                {productTypeFilter.length > 0 && (
                  <>
                    <span className="filter-count-badge">
                      {productTypeFilter.length}
                    </span>

                    <span
                      className="filter-clear-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductTypeFilter([]);
                      }}
                    >
                      <img src="filter_reset_icon.svg" />
                    </span>
                  </>
                )}
              </div>
            </div>
            <OverlayPanel ref={opFilter} className="global_dropdown_panel left-positioned">
              <div className="filter-label">Product Type</div>

              {productTypes.map((type) => {
                const formattedType = type
                  .replace(/[-/]/g, " ")
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .split(" ")
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");

                return (
                  <div key={type} className="filter_dropdown_item">
                    <input
                      type="checkbox"
                      id={`checkbox-${type}`}
                      checked={productTypeFilter.includes(type)}
                      onChange={() => toggleProductType(type)}
                    />
                    <label htmlFor={`checkbox-${type}`} className="filter_item_label">
                      {formattedType}
                    </label>
                  </div>
                );
              })}
            </OverlayPanel>

            <div
              className="toolbar-item"
              onClick={() => setSortAscending(prev => !prev)}
              style={{ cursor: "pointer" }}
            >
              <img src="/filter.svg" alt="Sort" />
              <span>{t("overview:sort")}</span>
            </div>
            <div
              className={`toolbar-item group-dropdown ${selectedGroupOption ? "filter-active" : ""
                }`}
              onClick={(e) => opGroup.current.toggle(e)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <img src="/Group.svg" alt="Group" className="search-img-container" />
              <span>{t("overview:group")}</span>
              {selectedGroupOption && (
                <span
                  className="filter-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroupOption(null);
                  }}
                >
                  <img src="filter_reset_icon.svg" />
                </span>
              )}
            </div>
            <OverlayPanel
              ref={opGroup}
              className="global_dropdown_panel left-positioned"
              style={{ width: "180px" }}
            >
              <div className="filter_dropdown_item">
                <input
                  type="checkbox"
                  id="group-product-type"
                  checked={selectedGroupOption === "product_type"}
                  onChange={() => handleGroupSelection("product_type")}
                />
                <label htmlFor="group-product-type" className="filter_item_label">
                  Product Type
                </label>
              </div>
            </OverlayPanel>
            <div className="toolbar-item">
              <img src="/manage-column.svg" alt="Manage Columns" />
              <span>{t("overview:manage_columns")}</span>
            </div>
          </div>
        </div>

        {/* Render Tab Content Based on Selected Index */}
        {activeIndex === 0 && (
          <AssetManagement
            searchQuery={searchQuery}
            productTypeFilter={productTypeFilter}
            groupBy={selectedGroupOption}
            sortAscending={sortAscending}
          />
        )}
        {activeIndex === 1 && <AllocatedAsset />}

        {/* <Footer /> */}
        <SyncPdtDialog
          visible={dialogVisible}
          setVisible={setDialogVisible}
          onSync={handleSyncPdt}
        />
      </div>
    </div>
  );
};

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'header',
        'overview',
        'placeholder',
        'dashboard',
        'button',
        'navigation'
      ])),
    },
  }
}

export default AssetManagementPage;
