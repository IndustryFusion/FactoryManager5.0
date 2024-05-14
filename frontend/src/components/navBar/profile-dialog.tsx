// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { startTimer } from "@/state/auth/authSlice";


interface ProfileDialogProps {
    profileDetailProp: boolean;
    setProfileDetailProp: Dispatch<SetStateAction<boolean>>;
}



const ProfileDialog: React.FC<ProfileDialogProps> = ({ profileDetailProp, setProfileDetailProp }) => {

    const user = useSelector((state: RootState) => state.auth.user);
    const timerValue = useSelector((state: RootState) => state.auth.timerValue);
    const dispatch = useDispatch();

    useEffect(() => {
        const timerId = setInterval(() => {
            dispatch(startTimer()); // Dispatch an action to increment the timer value
        }, 1000);
        return () => clearInterval(timerId);
    }, [dispatch])

    const formatTime = (seconds: any) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}h : ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`;
    };

    return (
        <div className=" flex justify-content-center">
            <Dialog visible={profileDetailProp} modal
                header="Profile Details"
                draggable={false} resizable={false}
                style={{ width: '40rem' }} onHide={() => setProfileDetailProp(false)}>
                <hr style={{ margin: '0' }} />
                <div className="flex justify-content-between ">
                <div className="mt-6 mb-2">
                    <span style={{fontWeight:"bold"}}>User Name : </span>
                    <span style={{ fontSize: "14px" }}> {user.length > 0 && user}</span>
                </div>
                <div className="mt-1">              
                    <span  style={{ color: "#0cb10c", fontSize: "16px", fontWeight: "700" }}> {formatTime(timerValue)}</span>
           
                </div>
                </div>
             


            </Dialog>
        </div>
    )
}
export default ProfileDialog;