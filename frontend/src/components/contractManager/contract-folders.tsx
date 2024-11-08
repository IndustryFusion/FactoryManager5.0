import { Dispatch, SetStateAction } from "react";
import { GiAlarmClock } from "react-icons/gi";
import { MdLockOpen, MdLockOutline } from "react-icons/md";

interface ContractCardsProps {
  setFilterContracts: Dispatch<SetStateAction<boolean>>;
  setIotAnalyticsFilterContracts: Dispatch<SetStateAction<boolean>>;
  setIotFinanceFilterContracts: Dispatch<SetStateAction<boolean>>;
  setContractsOriginal:Dispatch<SetStateAction<boolean>>;
  contractsOriginal:boolean;
  setShowAll ?: Dispatch<SetStateAction<boolean>>;
}

const ContractFolders: React.FC<ContractCardsProps> = ({ setFilterContracts, setIotAnalyticsFilterContracts, setIotFinanceFilterContracts, setContractsOriginal, contractsOriginal,setShowAll}) => {
    
  return (
    <>
      {contractsOriginal && (
        <>
          <div
            className="flex contract-card mr-5"
            style={{ gap: "3rem", marginTop: "2rem" }}
            onClick={() => {
                setContractsOriginal(false)
                setFilterContracts(true)
                setShowAll(false)
              }}
                
          >
            <div className="flex gap-2 folder-heading align-items-center">
              <i className="pi pi-folder"></i>
              <h3 className="m-0 contract-card-heading">Predictive Maintenance contracts</h3>
            </div>
            <div>
              <div>
                <p className="card-label-grey">Created at:</p>
                <p className="mt-1 card-label-black">28 Nov 2018</p>
              </div>
              <div className="mt-3">
                <p className="card-label-grey">Owner:</p>
                <p className="mt-1 card-label-black">You</p>
              </div>
            </div>
            <div>
              <p className="card-label-grey">Shared with:</p>
              <div className="flex mt-3">
                <div className="share-content user-1">OW</div>
                <div className="share-content user-2">NA</div>
                <div className="share-content user-3">MP</div>
              </div>
            </div>
          </div>
          <div
            className="flex contract-card mt-4 mr-5"
            style={{ gap: "3rem" }}
            onClick={() => {
              setContractsOriginal(false)
              setIotAnalyticsFilterContracts(true)
              setShowAll(false)
            }}
          >
            <div className="flex gap-2 folder-heading align-items-center">
              <i className="pi pi-folder"></i>
              <h3 className="m-0 contract-card-heading">Iot Analytics</h3>
            </div>
            <div>
              <div>
                <p className="card-label-grey">Created at:</p>
                <p className="mt-1 card-label-black">28 Nov 2018</p>
              </div>
              <div className="mt-3">
                <p className="card-label-grey">Owner:</p>
                <p className="mt-1 card-label-black">Lana Sparks</p>
              </div>
            </div>
            <div>
              <div>
                <p className="card-label-grey">Shared with:</p>
              </div>
              <div className="flex mt-3">
                <div className="share-content user-1">OW</div>
                <div className="share-content user-2">NA</div>
                <div className="share-content user-3">MP</div>
              </div>
            </div>
          </div>
          <div
            className="flex contract-card mt-4 mr-5"
            style={{ gap: "3rem" }}
            onClick={() => {
              setContractsOriginal(false)
              setIotFinanceFilterContracts(true)
              setShowAll(false)
            }}
          >
            <div className="flex gap-2 folder-heading align-items-center">
              <i className="pi pi-folder"></i>
              <h3 className="m-0 contract-card-heading">Iot Finance</h3>
            </div>
            <div>
              <div>
                <p className="card-label-grey">Created at:</p>
                <p className="mt-1 card-label-black">28 Nov 2018</p>
              </div>
              <div className="mt-3">
                <p className="card-label-grey">Owner:</p>
                <p className="mt-1 card-label-black">Lana Sparks</p>
              </div>
            </div>
            <div>
              <div>
                <p className="card-label-grey">Shared with:</p>
              </div>
              <div className="flex mt-3">
                <div className="share-content user-1">OW</div>
                <div className="share-content user-2">NA</div>
                <div className="share-content user-3">MP</div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ContractFolders;
