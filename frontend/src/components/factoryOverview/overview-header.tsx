import { useTranslation } from "next-i18next";
import { Button } from "primereact/button";
import { TabPanel, TabView } from "primereact/tabview";
import { useRef } from "react";
import AssetManagementDialog from "../assetManagement/asset-management";

type overviewHeaderProps = {
    factoryCount ?: number;
    setVisible:React.Dispatch<React.SetStateAction<boolean>>;
    assetManageDialog:boolean,
    setAssetManageDialog:React.Dispatch<React.SetStateAction<boolean>>;
  };

const OverviewHeader:React.FC<overviewHeaderProps> =({factoryCount, setVisible, assetManageDialog, setAssetManageDialog})=>{
    const { t } = useTranslation(['overview', 'placeholder']);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const triggerFileInput = () => {
      // Trigger the hidden file input onClick of the button
      if (fileInputRef.current != null) {
        fileInputRef.current.click();
      }
      //setAssetManageDialog(true);
    };

    const handleFileChange = (event: { target: { files: any; }; }) => {
      const files = event.target.files;
      if (files.length > 0) {
        // Assuming createAssets is a function that takes the selected file
        for (let i = 0; i < files.length; i++) {
          const reader = new FileReader();
  
          reader.onload = function (e) {
            // e.target.result contains the file's content as a text string
            try {
              const json = JSON.parse(e.target?.result as string); // Parse the JSON string into an object
              createAssets(JSON.stringify(json)); // Call createAssets with the parsed JSON data
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          };
  
          reader.onerror = function (error) {
            console.error('Error reading file:', error);
          };
  
          reader.readAsText(files[i]);
        };
      }
    };
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
                <button className="import-asset-btn"  onClick={triggerFileInput}>
                {t('overview:importAsset')}
                  <i className="pi pi-download" style={{marginRight:"8px", color:"#95989A",marginLeft:"12px"}} />
                  </button>                 
             <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }} // Hide the file input
            />
          {
            assetManageDialog &&
            < AssetManagementDialog
              assetManageDialogProp={assetManageDialog}
              setAssetManageDialogProp={setAssetManageDialog}
            />
          }

                </div>
               <div>
               <Button
                  className="add-asset-btn flex justify-content-center align-items-center border-none"
                  onClick={() => setVisible(true)}
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