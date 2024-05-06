import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction } from "react";

interface ProfileDialogProps {
    profileDetailProp: boolean;
    setProfileDetailProp: Dispatch<SetStateAction<boolean>>;
  }
  


const ProfileDialog: React.FC<ProfileDialogProps> =({profileDetailProp, setProfileDetailProp})=>{
    return(
        <div className=" flex justify-content-center">        
        <Dialog visible={profileDetailProp} modal 
        header="Profile Details"
            draggable={false} resizable={false}
            style={{ width: '40rem' }} onHide={() => setProfileDetailProp(false)}>
            <p>Username : </p>
            <p className="mt-0" style={{color:"green", fontSize:"13px"}}>Login Since</p>
         </Dialog>
</div> 
    )
}
export default ProfileDialog;