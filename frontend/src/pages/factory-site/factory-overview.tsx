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

import { MdLocationOn } from "react-icons/md";
import { Factory } from "../../types/factory-type";
import axios, { AxiosError }  from "axios";
import { useEffect, useState, useRef } from "react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Button } from "primereact/button";
import "../../styles/factory-overview.css";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";
import { useRouter } from "next/router";
import Navbar from "../../components/navBar/navbar";
import Sidebar from '@/components/navBar/sidebar';
import Footer from "../../components/navBar/footer";
import { deleteFactory } from "@/utility/factory-site-utility";
import CreateFactory from "@/components/factoryForms/create-factory-form";
import EditFactory from "@/components/factoryForms/edit-factory-form";
import { Toast, ToastMessage } from "primereact/toast";
import AssetManagementDialog from "@/components/assetManagement/asset-management";
import { useDispatch } from "react-redux";
import { reset } from "@/redux/unAllocatedAsset/unAllocatedAssetSlice";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Asset } from "@/types/asset-types";
import DeleteDialog from "@/components/delete-dialog";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryOverview = () => {
  const router = useRouter();
  const { t } = useTranslation(['overview', 'placeholder']);
  const [factorySite, setFactorySite] = useState<Factory[]>([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1 | null>(null);
  const [sortField, setSortField] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filteredValue, setFilteredValue] = useState<Factory[] | null>(null);
  const [visible, setVisible] = useState(false);
  const [visibleDelete, setVisibleDelete] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editFactory, setEditFactory] = useState<string | undefined>("");
  const [assetManageDialog, setAssetManageDialog] = useState(false);
  const [factoryToDelete, setFactoryToDelete] = useState<Factory | null>(null);
  const [factoryName, setFactoryName] = useState<string>('');
  const toast = useRef<Toast | null>(null);
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sortOptions = [
    { label: "A-Z", value: "factory_name" },
    { label: "Z-A", value: "!factory_name" },
  ];
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  // Function to map the backend data to the factorylist structure
  const mapBackendDataToFactoryLists = (backendData: Asset[]): Factory[] => {
    return backendData.map((item: any) => {
      const newItem: any = {};
      Object.keys(item).forEach((key) => {
        if (key.includes("http://www.industry-fusion.org/schema#")) {
          const newKey = key.replace(
            "http://www.industry-fusion.org/schema#",
            ""
          );
          newItem[newKey] =
            item[key].type === "Property" ? item[key].value : item[key];
        } else {
          newItem[key] = item[key];
        }
      });
      return newItem;
    });
  };

  const fetchFactoryLists = async () => {
    try {
      const response = await axios.get(API_URL + "/factory-site", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      const responseData = response.data;
      const mappedData = mapBackendDataToFactoryLists(responseData);
      setFactorySite(mappedData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast("error", "Error","Getting factory lists" )     
      }
    }
  };


  useEffect(() => {
    if (router.isReady) {
      const { } = router.query;//needed
      fetchFactoryLists();
      setGlobalFilterValue("");
    }   
  }, [visible, isEdit, router.isReady]);

  const onSortChange = (event: DropdownChangeEvent) => {
    const value = event.value;

    if (value.indexOf("!") === 0) {
      setSortOrder(-1);
      setSortField(value.substring(1, value.length));
      setSortKey(value);
    } else {
      setSortOrder(1);
      setSortField(value);
      setSortKey(value);
    }
  };

  const triggerFileInput = () => {
    // Trigger the hidden file input onClick of the button

    if (fileInputRef.current != null) {
      fileInputRef.current.click();
    }
    //setAssetManageDialog(true);

  };

  async function createAssets(body: string) {
    try {
      const response = await axios.post(API_URL + "/asset", body, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      if (response.data?.status === 201 && response.data?.success === true) {
        showToast("success", "success", "Asset imported successfully")
        setAssetManageDialog(true);
      }
    } catch (error) {
      showToast("error", "Error", "Fetching imported asset")
      console.error("Error:", error);
    }
  }

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

  const onFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    if (value.length === 0) {
      setFilteredValue(null);
    } else {
      const filtered =
        value.length > 0
          ? factorySite?.filter((factory:Factory) => {
            return (
              factory.factory_name?.toLowerCase().includes(value.toLowerCase()) ||
              factory?.country?.toLowerCase().includes(value.toLowerCase())
            );
          })
          : factorySite;
      setFilteredValue(filtered);
    }
  };

  const dataViewHeader = (
    <div className="flex flex-column md:flex-row md:justify-content-between  gap-8 px-2 factory-overview">
      <div>
      <Dropdown
        optionLabel="label"
        placeholder={t('placeholder:sortByFactory')}
        options={sortOptions}
        onChange={onSortChange}
      
      />
      </div>
      <div>
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            style={{ width: "30rem" }}
            placeholder={t('placeholder:searchByFactoryCountry')}
            value={globalFilterValue}
            onChange={onFilter}
          />
        </span>
      </div>
      <div className=" flex justify-content-end align-items-center" >
        <div className="mr-3">
          <Button
            label={t('overview:importAsset')}
            onClick={triggerFileInput}
            className="bg-purple-100 factory-btn"
          />
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
        <Button
          label={t('overview:createFactory')}
          className="bg-blue-100 factory-btn"
          onClick={() => setVisible(true)}
        />
      </div>
    </div>
  );

  // Confirm deletion dialog
  const confirmDeleteFactory = (factory: Factory) => {    
    setVisibleDelete(true);
    setFactoryToDelete(factory);
    setFactoryName(factory?.factory_name ?? '')
  
  };

  // Handles factory deletion
  const handleDeleteFactory = async () => {
    if (!factoryToDelete) return;
   
    try {
      await deleteFactory(factoryToDelete);
      dispatch(reset());
      await fetchFactoryLists();
      setVisibleDelete(false);
      showToast("success", "success", "Factory deleted successfully")

    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast("error", "Error", " deleting factory")
      }
      console.error("Error deleting factory", error);
    }
  };

  const itemTemplate = (data: Factory) => {
    return (
      <>
        <div className="col-12 lg:col-3 pt-2 factory-overview "
          style={{ padding: " 0 1rem" }}>
          <div className="card  border-1 surface-border mt-4">
            <div className="flex gap-2 mb-3">
              <div className="factory-text-container">
                <div className="flex flex-column factory-card-content">
                  <div>
                    <p className="card-title font-bold mt-2  capitalize">
                      {data.factory_name}
                    </p>
                  </div>
                  <div className="address-text">
                    <p className="m-0 flex align-items-center">
                      <MdLocationOn
                        className="mr-1 location-icon"
                      />
                      <span>{data.street}, {data.country}</span>
                    </p>
                    <p className="mt-1 zip-text">- {data.zip}</p>
                  </div>
                </div>
              </div>
              <div className="image-container" >
                <div >
                  <img
                    src={`${data.thumbnail}`}
                    alt={data.factory_name}
                    className=" factory-image shadow-2 mt-3  border-round "
                  />
                </div>

              </div>

            </div>

            <div className="action-btn-container">
              <Button
                icon="pi pi-eye"
                className="p-button-rounded p-button-secondary p-button-sm view-btn"
                onClick={() =>
                  router.push(`/factory-site/factory-management/${data.id}`)
                }
              />
              <Button
                icon="pi pi-pencil"
                className="p-button-rounded p-button-secondary p-button-sm edit-btn"
                onClick={() => {
                  setEditFactory(data.id);
                  setIsEdit(true)
                }
                }
              />
              <Button
                icon="pi pi-trash"
                className="p-button-rounded p-button-secondary p-button-sm delete-btn"
                onClick={() => confirmDeleteFactory(data)}
              />
            </div>

          </div>
        </div>
      </>
    );
  };

 


  return (
    <div className="flex">
      <Sidebar/>
      <div className={isSidebarExpand ? "factory-container" : "factory-container-collpase"}>
        <div className="navbar_wrapper mt-3">
         <Navbar navHeader="Factory Overview" />
        </div>
        <div className="dashboard-container">
          <Toast ref={toast} />
          <div className="grid py-1 px-2 factory-overview">
            <div className="col-12">
              <DataView
                value={filteredValue || factorySite}
                itemTemplate={itemTemplate}
                header={dataViewHeader}
                sortOrder={sortOrder}
                sortField={sortField}
              />
            </div>
          </div>
          {visible && (
            <CreateFactory
              visibleProp={visible}
              setVisibleProp={setVisible}
            />
          )}
          {isEdit && (
            <EditFactory
              factory={editFactory}
              isEditProp={isEdit}
              setIsEditProp={setIsEdit}
            />
          )}
          {visibleDelete && (
            <DeleteDialog
              deleteDialog={visibleDelete}
              setDeleteDialog={setVisibleDelete}
              handleDelete={handleDeleteFactory}
              deleteItemName={factoryName}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};


export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'header',
        'overview',
        'placeholder',
        'dashboard',
        'button'
      ])),
    },
  }
}
export default FactoryOverview;
