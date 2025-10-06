import React, { useEffect, useState } from 'react';
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

const AssetManagementPage = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const dispatch = useDispatch();
  const activeIndex = useSelector((state: RootState) => state.assetManagement.activeTabIndex);
  const { assets } = useSelector((state: RootState) => state.assetManagement);
  const { t } = useTranslation(['common', 'button', 'overview']);
  const [dataInitialized, setDataInitialized] = useState(false);

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
                paddingLeft:"12px"
              }}
            >
              <img src="/search_icon.svg" alt="Search" className="search-icon" />
              <input type="text" placeholder={t("overview:search")} className="search-input" />
            </div>
          </div>

          <div className="toolbar-right">
            <div className="toolbar-item">
              <img src="/Sort.svg" alt="Filter" className="search-img-container" />
              <span>{t("overview:filter")}</span>
            </div>
            <div className="toolbar-item">
              <img src="/filter.svg" alt="Sort" />
              <span>{t("overview:sort")}</span>
            </div>
            <div className="toolbar-item">
              <img src="/Group.svg" alt="Group" />
              <span>{t("overview:group")}</span>
            </div>
            <div className="toolbar-item">
              <img src="/manage-column.svg" alt="Manage Columns" />
              <span>{t("overview:manage_columns")}</span>
            </div>
          </div>
        </div>

        {/* Render Tab Content Based on Selected Index */}
        {activeIndex === 0 && <AssetManagement />}
        {activeIndex === 1 && <AllocatedAsset />}

        {/* <Footer /> */}
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
