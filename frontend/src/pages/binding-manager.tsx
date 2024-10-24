import Navbar from "@/components/navBar/navbar";
import Sidebar from "@/components/navBar/sidebar";
import React, { useEffect, useState, useRef } from "react";
import "../styles/contract-manager.css";
import ContractHeader from "@/components/contractManager/contract-header";
import { InputText } from "primereact/inputtext";
import { Tree } from "primereact/tree";
import { NodeService } from "@/service/NodeService";
import { Checkbox } from "primereact/checkbox";
import { getAccessGroup } from "@/utility/indexed-db";
import { getBindings } from "@/utility/bindings";
import ContractCard from "@/components/contractManager/contract-file";
import { IoArrowBack } from "react-icons/io5";
import ContractFolders from "@/components/contractManager/contract-folders";
import { Toast, ToastMessage } from "primereact/toast";
import axios from "axios";
import { fetchBindingsRedux } from "@/redux/binding/bindingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import BindingCard from "@/components/contractManager/binding-card";
import BindingHeader from "@/components/contractManager/binding-header";

const BindingManager = () => {
  const [nodes, setNodes] = useState([]);
  const [companyIfricId, setCompanyIfricId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  // const [contractsData, setContractsData] = useState([]);
  const [predictiveFilteredContractsData, setpredictiveFilteredContractsData] = useState([]);
  const [filterContracts, setFilterContracts] = useState(false);
  const [insuranceFilterContracts, setInsuranceFilterContracts] =useState(false);
  const [contractsOriginal, setContractsOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const toast = useRef<Toast>(null);
  const dispatch = useDispatch();
  const router = useRouter();

  // Access the bindings data from Redux
  const bindingsData = useSelector((state: any) => state.bindings.bindings);

  console.log("bindingsData here", bindingsData);
  console.log("contracts original",contractsOriginal);
  
  


  const showToast = (
    severity: ToastMessage["severity"],
    summary: string,
    message: string
  ) => {
    toast.current?.show({
      severity: severity,
      summary: summary,
      detail: message,
      life: 8000,
    });
  };

  useEffect(() => {
    NodeService.getTreeNodes().then((data) => setNodes(data));
  }, []);

  const getCompanyId = async () => {
    try {
    const details = await getAccessGroup();
    setCompanyIfricId(details.company_ifric_id);
    const ifricId = details.company_ifric_id;
    if (ifricId) {
      dispatch(fetchBindingsRedux(ifricId));
    }
    } catch(error: any) {
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data.message);
        showToast("error", "Error", "Fetching assets");
      } else {
        console.error("Error:", error);
        showToast("error", "Error", error);
      }
    }
  };

  useEffect(() => {
    getCompanyId();
  },[companyIfricId]);


  const handleFilterContracts = () => {
    setLoading(true);

    setTimeout(() => {
      const filteredData = bindingsData.filter(
        (contract) =>
          contract?.contract_type?.trim() ===
          "https://industry-fusion.org/contracts/v0.1/predictiveMaintenanceLaserCutter"
      );
      setpredictiveFilteredContractsData(filteredData);
      setLoading(false);
    }, 2000); // Adjust the delay time in milliseconds (e.g., 1000 = 1 second)
  };

  useEffect(() => {
    if (filterContracts) {
      handleFilterContracts();
    }
  }, [filterContracts]);

  const handleCreateClick = () => {
    router.push("/create-binding");
  };

  console.log("bindingsData", bindingsData);
  

  return (
    <>
      <div className="flex">
      <Sidebar />
        <Toast ref={toast} />
        <div className="main_content_wrapper">
          <div className="navbar_wrapper">
            <Navbar navHeader="Binding Manager" />
            <div className="flex gap-4 contract-container">
              <div className="contract-left-container">
                <div className="contract-search-container">
                  <InputText
                    className="contract-search-input"
                    // value={globalFilterValue}
                    // onChange={onFilter}
                    placeholder="Search contracts"
                  />
                  <img
                    className="search-expand"
                    src="/search_icon.svg"
                    alt="search-icon"
                  />
                </div>
                <div className="mt-6">
                  <h3 className="m-0 ml-1 heading-folder-text">Folders</h3>
                  <div className=" flex mt-1 contracts-tree">
                    <Tree
                      value={nodes}
                      selectionMode="single"
                      selectionKeys={selectedKey}
                      onSelectionChange={(e) => setSelectedKey(e.value)}
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex gap-3">
                    <p
                      className="card-label-grey"
                      style={{ textDecoration: "underline" }}
                    >
                      Select All
                    </p>
                    <p
                      className="card-label-grey"
                      style={{ textDecoration: "underline" }}
                    >
                      Unselect All
                    </p>
                  </div>
                  <div className="flex gap-2 align-items-center">
                    <Checkbox />
                    <p className="m-0">Ewelina</p>
                  </div>
                  <div className="flex gap-2 align-items-center mt-2">
                    <Checkbox />
                    <p className="m-0">Patt Member</p>
                  </div>
                </div>
              </div>
              <div className="contract-right-container">
                <BindingHeader 
                handleCreateClick={handleCreateClick}
                />
                <div className="contract-cards-container">
                <h2 className="ml-5 mb-0">Folders</h2>
                  <ContractFolders
                    setFilterContracts={setFilterContracts}
                    setInsuranceFilterContracts={setInsuranceFilterContracts}
                    setContractsOriginal={setContractsOriginal}
                    contractsOriginal={contractsOriginal}
                  />
                  {loading ? (
                    <div></div>
                  ) : (
                    <>
                      {!contractsOriginal && (
                        <div className="ml-1">
                          <button
                            className="back-btn flex justify-content-center align-items-center border-none black_button_hover "
                            onClick={() => {
                              setInsuranceFilterContracts(false);
                              setFilterContracts(false);
                              setContractsOriginal(true);
                            }}
                          >
                            <IoArrowBack className="mr-1" />
                            <span className="mt-1">Back</span>
                          </button>
                        </div>
                      )}
                      {filterContracts &&
                        predictiveFilteredContractsData.length > 0 &&
                        predictiveFilteredContractsData.map((contract) => (
                          <div  key={contract._id}>
                             <ContractCard
                            contract={contract}
                          />
                          </div> 
                        ))}
                      {insuranceFilterContracts && (
                        <div>
                          <h3 className="not-found-text">
                            Insurance contract files not found
                          </h3>
                        </div>
                      )}
                      <div>
                      <h2 className="ml-5 mt-7 heading-file-text">Files</h2>
                      {contractsOriginal &&
                        bindingsData.map((binding) => (
                          <div key={binding._id}>
                            <BindingCard binding={binding} />
                          </div>
                        ))}
                      </div>
                     
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BindingManager;
