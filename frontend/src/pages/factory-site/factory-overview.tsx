import { MdLocationOn } from "react-icons/md";
import { Factory } from "@/interfaces/factoryType";
import axios from "axios";
import { useEffect, useState } from "react";
import { DataView, DataViewLayoutOptions } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Button } from "primereact/button";
import "../../styles/factory-overview.css";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";
import { useRouter } from "next/navigation";
import HorizontalNavbar from "../../components/horizontal-navbar";
import { deleteFactory } from "@/utility/factory-site-utility";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryOverview = () => {
  const router = useRouter();
  const [factorySite, setFactorySite] = useState<Factory[]>([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1 | null>(null);
  const [sortField, setSortField] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filteredValue, setFilteredValue] = useState<Factory[] | null>(null);

  const sortOptions = [
    { label: "A-Z", value: "factory_name" },
    { label: "Z-A", value: "!factory_name" },
  ];

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
      const mappedData = mapBackendDataToFactoryLists(responseData);
      setFactorySite(mappedData);
      console.log(mappedData, "factory response here");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchFactoryLists();
    setGlobalFilterValue("");
  }, []);

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
              factory.factory_name
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
      <Dropdown
        optionLabel="label"
        placeholder="Sort By Factory Name"
        options={sortOptions}
        onChange={onSortChange}
      />
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
      <Button
        label="Create Factory"
        className="bg-blue-100 factory-btn"
        onClick={() => router.push("/factory-site/create")}
      />
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
      await fetchFactoryLists();
    } catch (error) {
      console.error("Error deleting factory", error);
    }
  };

  const itemTemplate = (data: Factory) => {
    return (
      <>
        
        <div className="col-12 lg:col-3 pt-2 factory-overview" 
        style={{ backgroundColor: "#f1f1f13d", padding: "1rem" }}>
          <div className="card  border-1 surface-border">
            <div className="flex gap-2 mb-3">
              <div className="image-container" >
                <div >
                  <img
                    src={`${data.thumbnail}`}
                    alt={data.factory_name}
                    className=" factory-image shadow-2 mt-3  border-round "
                  />
                </div>

              </div>
              <div className="factory-text-container">
                <div className="flex flex-column factory-card-content">
                  <div>
                    <p className="card-title font-bold mt-2 mb-3 capitalize">
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
                onClick={() => router.push(`/factory-site/${data.id}`)}
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
    <HorizontalNavbar />
      <div className="grid py-1 px-2 factory-overview " >
        <div className="col-12">
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
    </>
  );
};

export default FactoryOverview;
