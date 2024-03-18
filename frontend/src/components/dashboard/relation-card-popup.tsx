import { useDashboard } from "@/context/dashboardContext";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction } from "react";

interface RelationPopupProps {
    relationsProp: boolean;
    setRelationsProp: Dispatch<SetStateAction<boolean>>;
}


const RelationDialog:React.FC<RelationPopupProps> =({relationsProp, setRelationsProp})=>{

    const {selectedAssetData} = useDashboard();

    console.log(selectedAssetData, "what'sthe selected Asset here");

    const prefix = "has";
    const allKeys = Object.keys(selectedAssetData);
    const prefixedKeys = allKeys.filter(key => key.startsWith(prefix));
    console.log(prefixedKeys, "all relations");
    
    
    return(
        <>
          <div className="card flex justify-content-center">
           <Dialog header="Relations" visible={relationsProp} style={{ width: '50vw' }} onHide={() => setRelationsProp(false)}>
               
            </Dialog>
           </div>
        </>
    )
}

export default RelationDialog;