import { useTranslation } from "next-i18next";
import { Button } from "primereact/button";
import { TabPanel, TabView } from "primereact/tabview";

type overviewHeaderProps = {
    factoryCount ?: number;
  };

const OverviewHeader:React.FC<overviewHeaderProps> =({factoryCount})=>{
    const { t } = useTranslation(['overview', 'placeholder']);
    return (
        <>
          <div className="asset-header">
            <div className="flex justify-content-between">
              <div className="flex">
                <p className="total-assets-text">
                  <span className="asset-count mr-1">{factoryCount}</span>
                  <span className="asset-text">Factories</span>
                </p>
    
                <div>
                  <TabView
                    className="asset-tabs"
                    // activeIndex={activeTab === "Assets" ? 0 : 1}
                    // onTabChange={(e) =>
                    //   setActiveTab(e.index === 0 ? "Assets" : "Models")
                    // }
                  >
                    <TabPanel header="Active"></TabPanel>
                    <TabPanel header="Draft"></TabPanel>
                  </TabView>
                </div>
              </div>
              <div className="flex gap-2">
              <div>
            
                <button className="import-asset-btn">
                {t('overview:importAsset')}
                  <i className="pi pi-download" style={{marginRight:"8px", color:"#95989A",marginLeft:"12px"}} />
                  </button>
                </div>
               <div>
               <Button
                  className="add-asset-btn flex justify-content-center align-items-center border-none"
                >
               {t('overview:createFactory')}
                  <img src="/plus-icon.png" alt="plus icon" />
                </Button>
               </div>

               
              </div>
            </div>
          </div>
        </>
      );
}
export default OverviewHeader;