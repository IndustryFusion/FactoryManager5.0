import { Button } from "primereact/button"
import { ProgressSpinner } from "primereact/progressspinner"
import { Toast, ToastMessage } from "primereact/toast"
import {  useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";

interface BlockTimerProps {
  setBlockerProp: (value: boolean) => void;
  blockerProp: boolean
}

const BlockTimer: React.FC<BlockTimerProps> =({setBlockerProp, blockerProp})=>{
    const [countDown, setCountDown] = useState(60*5);
    const { t } = useTranslation('button');
    const toast = useRef<any>(null);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 8000 });
      };
    
    useEffect(() => {
        let timerId:any;
      
        if (blockerProp) {
          showToast('success', "Success", "Added To onboarding configurations successfully");
    
          timerId = setInterval(() => {
            setCountDown(prevCountDown => {
              if (prevCountDown <= 1) {
                clearInterval(timerId);
                setBlockerProp(false);
                return 0;
              }
              return prevCountDown - 1;
            });
          }, 1000);
        }    
        return () => {
          if (timerId) {
            clearInterval(timerId);
          }
        };
      }, [blockerProp]);

return(
    <>
     <div className="blocker">
        <Toast ref={toast} />
        <div className="card blocker-card">
          <p>Restart the Machine to finish onboarding</p>
          <div className="loading-spinner">
          <ProgressSpinner />
          </div>
          <div>
          <p>Time Remaining:
            <span style={{color:"red",marginRight:"5px"}}>{Math.floor(countDown / 60)}:{countDown % 60 < 10 ? '0' : ''}{countDown % 60}</span>
              mins</p>
          </div>
          <div className="flex justify-content-end">
          <Button
                label={t('cancel')}
                severity="danger" outlined
                className="mr-2"
                type="button"
                onClick={() => setBlockerProp(false)}
            />
          </div>
        </div>
      </div>
    </>
)

}

export default BlockTimer;