import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { startTimer } from "@/state/auth/authSlice";


interface ProfileDialogProps {
    profileDetailProp: boolean;
    setProfileDetailProp: Dispatch<SetStateAction<boolean>>;
  }
  


const ProfileDialog: React.FC<ProfileDialogProps> =({profileDetailProp, setProfileDetailProp})=>{
    
    const user = useSelector((state: RootState)  => state.auth.user);
    const timerValue = useSelector((state: RootState) => state.auth.timerValue);
    const dispatch = useDispatch();

    useEffect(()=>{
        const timerId = setInterval(() => {
            dispatch(startTimer()); // Dispatch an action to increment the timer value
          }, 1000);
          return () => clearInterval(timerId);
    }, [dispatch])

    const formatTime = (seconds:any) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
     };
    
    return(
        <div className=" flex justify-content-center">        
        <Dialog visible={profileDetailProp} modal 
        header="Profile Details"
            draggable={false} resizable={false}
            style={{ width: '40rem' }} onHide={() => setProfileDetailProp(false)}>
            <p>User Name : {user.length > 0 && user}</p>
            <p className="mt-0" style={{color:"green", fontSize:"13px"}}>Login Since: {formatTime(timerValue)}</p>
         </Dialog>
</div> 
    )
}
export default ProfileDialog;