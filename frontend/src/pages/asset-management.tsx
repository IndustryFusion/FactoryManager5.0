import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AssetManagement from "../components/assetManagement/asset-management-new";
import AllocatedAsset from "../components/assetManagement/allocated-asset"
import Sidebar from '@/components/navBar/sidebar';
import Navbar from '@/components/navBar/navbar';
import Footer from '@/components/navBar/footer';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import '@/styles/asset-management/asset-management-page.css'
import { fetchAssets, setActiveTabIndex } from '@/redux/assetManagement/assetManagementSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';

const AssetManagementPage = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const dispatch = useDispatch();
  const activeIndex = useSelector((state: RootState) => state.assetManagement.activeTabIndex);
  const { t } = useTranslation(['common', 'button']);

    useEffect(() => {
    const initializeAssets = async () => {
      try {
        await dispatch(fetchAssets());
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      }
    };

    initializeAssets();
  }, []); 
  
  return (
    <div className="flex">
      <Sidebar/>
      <div className={isSidebarExpand ? "factory-container"  : "factory-container-collpase"} >
        <div className='navbar-wrapper mt-4'>
          <Navbar navHeader="Asset Management" />
        </div>
        <div className="dashboard-container">
          <div className="p-2 md:p-4">
            <Card className="mb-4">
              <TabView activeIndex={activeIndex} onTabChange={(e) => dispatch(setActiveTabIndex(e.index))} className="asset-tabs">
                <TabPanel header="Asset Table">
                  <div className="p-2 md:p-3">
                    <AssetManagement />
                  </div>
                </TabPanel>
                <TabPanel header="Allocated Assets">
                  <div className="p-2 md:p-3">
                    <AllocatedAsset />
                  </div>
                </TabPanel>
              </TabView>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export const getServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'button', 'header', 'placeholder'])),
  },
});

export default AssetManagementPage;