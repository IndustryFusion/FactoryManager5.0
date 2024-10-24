import { getCompanyDetails, getContractData, getSharedWithBindingCompanies } from "@/utility/bindings";
import { getAccessGroup } from "@/utility/indexed-db";
import moment from "moment";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GiAlarmClock } from "react-icons/gi";
import { MdLockOpen, MdLockOutline } from "react-icons/md";

const BindingCard: React.FC<any> = ({ binding }) => {
  const [contractData, setContractData] = useState({});
  const [loginCompanyName, setLoginCompanyName] = useState("");
  const formattedDate = moment(binding?.meta_data?.created_at).format(
    "DD MMM YYYY"
  );
  const router = useRouter();

  const fetchContractData = async (contractId: string) => {
    try {
      const response = await getContractData(contractId);
      const [contract] = response;
      console.log("contract details", contract);
      
      setContractData(contract);
    } catch (error) {
      console.error(error);
    }
  };

 

  const fetchSharedCompanies =async(bindingIfricId:string)=>{
    const response = await getSharedWithBindingCompanies(bindingIfricId);
    console.log("response from endpoint here", response );
    
  }
  
  useEffect(() => {
    fetchContractData(binding?.contract_id);
    fetchSharedCompanies(binding?.contract_binding_ifric_id)
  }, [binding?.contract_id]);




  return (
    <div
      onClick={() =>
        router.push(`binding/${binding?.contract_binding_ifric_id}`)
      }
      className="flex contract-card mt-4 mr-5"
      style={{ gap: "3rem" }}
    >
      <div className="flex gap-2 folder-heading align-items-center">
        <i className="pi pi-file-import" style={{ fontSize: "22px" }}></i>
        <h3 className="m-0 binding-card-heading">
          {contractData?.contract_name}
        </h3>
      </div>
      <div>
        <div>
          <p className="card-label-grey">Created at:</p>
          <p className="mt-1 card-label-black">{formattedDate}</p>
        </div>
        <div className="mt-3">
          <p className="card-label-grey">Created by:</p>
          <p className="mt-1 card-label-black">
            {binding?.meta_data?.created_user}
          </p>
        </div>
      </div>
      <div>
        <p className="card-label-grey">Shared with:</p>
        <div className="flex mt-3">
          <div className=" share-content user-one">OW</div>
          <div className=" share-content user-two">NA</div>
        </div>
      </div>
      <div>
        <div className="flex gap-3">
          <i className=" pi pi-arrow-right" style={{ color: "#1be21b" }}></i>
          <MdLockOutline style={{ fontSize: "20px", color: "#1be21b" }} />
          <div>
            <p className="card-label-black">{contractData?.consumer_company_name}</p>
            {/* <p className="mt-1 card-label-grey">Jacob Hamesworth</p> */}
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <i className="pi pi-eye" style={{ color: "#95989a" }}></i>
          <MdLockOpen style={{ fontSize: "20px", color: "#95989a" }} />
          <div>
            <p className="card-label-black">{binding?.provider_company_name}</p>
            {/* <p className="mt-1 card-label-grey">Jarek Owczarek</p> */}
          </div>
        </div>
        <div></div>
      </div>
      <div className="flex justify-content-center align-items-center">
        <button className="reminder-btn">
          <GiAlarmClock className="mr-2" />
          Add Reminder
        </button>
      </div>
    </div>
  );
};
export default BindingCard;
