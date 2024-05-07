import { MdLocationOn } from "react-icons/md";
import { Factory } from "@/interfaces/factory-type";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { DataView, DataViewLayoutOptions } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Button } from "primereact/button";
import "../../styles/factory-overview.css";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";
import { useRouter } from "next/router";
import HorizontalNavbar from "../../components/navBar/horizontal-navbar";
import Footer from "../../components/navBar/footer";
import { deleteFactory } from "@/utility/factory-site-utility";
import { Dialog } from "primereact/dialog";
import CreateFactory from "@/components/factoryForms/create-factory-form";
import EditFactory from "@/components/factoryForms/edit-factory-form";
import Cookies from 'js-cookie';
import { Toast, ToastMessage } from "primereact/toast";
import AssetManagement from "@/components/asset-management";
import AssetManagementDialog from "@/components/assetManagement/asset-management";
import { useDispatch } from "react-redux";
import { reset } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryOverview = () => {
  const router = useRouter();
  const [factorySite, setFactorySite] = useState<Factory[]>([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1 | null>(null);
  const [sortField, setSortField] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filteredValue, setFilteredValue] = useState<Factory[] | null>(null);
  const [visible, setVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editFactory, setEditFactory] = useState<string | undefined>("");
  const [assetManageDialog, setAssetManageDialog] = useState(false);
  const toast = useRef<Toast | null>(null);
  const dispatch = useDispatch();

  const sortOptions = [
    { label: "A-Z", value: "factory_name" },
    { label: "Z-A", value: "!factory_name" },
  ];


  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  // Function to map the backend data to the factorylist structure
  const mapBackendDataToFactoryLists = (backendData: any[]): Factory[] => {
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
      // console.log("factory data", responseData);
      const mappedData = mapBackendDataToFactoryLists(responseData);
      setFactorySite(mappedData);
      // console.log(mappedData, "factory response here");
    } catch (error: any) {
      if (error.response && error.response?.status === 404) {
        showToast(error, "Error","Getting factory lists" )     
      }
    }
  };


  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { } = router.query;
        fetchFactoryLists();
        setGlobalFilterValue("");
      }
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

  const fileInputRef = useRef(null);
  const triggerFileInput = () => {
    // Trigger the hidden file input onClick of the button

    if (fileInputRef.current != null) {
      fileInputRef.current.click();
    }
    //setAssetManageDialog(true);
    console.log("fileInputRef.current", fileInputRef.current);

  };

  async function createAssets(body: any) {
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
      console.log("file uploaded ", response.data);
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
            const json = JSON.parse(e.target.result); // Parse the JSON string into an object
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
          ? factorySite?.filter((factory) => {
            return (
              factory?.factory_name
                .toLowerCase()
                .includes(value.toLowerCase()) ||
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
        placeholder="Sort By Factory Name"
        options={sortOptions}
        onChange={onSortChange}
      
      />
      </div>
      <div>
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            style={{ width: "30rem" }}
            placeholder="Search by Factory Name, Country"
            value={globalFilterValue}
            onChange={onFilter}
          />
        </span>
      </div>
      <div className=" flex justify-content-end align-items-center" >
        <div className="mr-3">
          <Button
            label="Import Assets"
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
          label="Create Factory"
          className="bg-blue-100 factory-btn"
          onClick={() => setVisible(true)}
        />
      </div>
    </div>
  );

  // Confirm deletion dialog
  const confirmDeleteFactory = (factory: Factory) => {
    console.log("inside confirm delete");
    confirmDialog({
      message: "Are you sure you want to delete this factory?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => handleDeleteFactory(factory),
    });
  };

  // Handles factory deletion
  const handleDeleteFactory = async (factoryToDelete: Factory) => {
    console.log("inside handle delete");
    try {
      await deleteFactory(factoryToDelete);
      dispatch(reset());
      await fetchFactoryLists();
      showToast("success", "success", "Factory deleted successfully")

    } catch (error: any) {
      if (error.response && error.response?.status === 404) {
        showToast(error, "Error", " deleting factory")
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
                  router.push(`/factory-site/shop-floor/${data.id}`)
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
    <>
      <Toast ref={toast} />
      <HorizontalNavbar />
      <div className="grid py-1 px-2 factory-overview " style={{ zoom: "80%" }} >
        <div className="col-12" style={{ marginTop: "5rem" }}>
          <ConfirmDialog />
          <div className="">
            <h2 className="ml-4">Factory Overview</h2>
            <DataView
              value={filteredValue || factorySite}
              itemTemplate={itemTemplate}
              header={dataViewHeader}
              sortOrder={sortOrder}
              sortField={sortField}
            />
          </div>
        </div>
      </div>
      {visible &&
        <CreateFactory
          visibleProp={visible}
          setVisibleProp={setVisible}
        />
      }
      {isEdit &&
        <EditFactory
          factory={editFactory}
          isEditProp={isEdit}
          setIsEditProp={setIsEdit}
        />
      }
      <Footer />
    </>
  );
};

export default FactoryOverview;
