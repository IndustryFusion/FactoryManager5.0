import Sidebar from "@/components/navBar/sidebar";
import "../../styles/factory-overview.css";
import { useRef, useState } from "react";
import Footer from "@/components/navBar/footer";
import Navbar from "@/components/navBar/navbar";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import OverviewHeader from "@/components/factoryOverview/overview-header";
import FactoryCard from "@/components/factoryOverview/factoryCard";
import { InputText } from "primereact/inputtext";
import { Factory } from "@/types/factory-type";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import CreateFactory from "@/components/factoryForms/create-factory-form";
import EditFactory from "@/components/factoryForms/edit-factory-form";
import DeleteDialog from "@/components/delete-dialog";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { Toast, ToastMessage } from "primereact/toast";
import { deleteFactory } from "@/utility/factory-site-utility";
import { reset } from "@/redux/unAllocatedAsset/unAllocatedAssetSlice";
import axios from "axios";
import { Asset } from "@/types/asset-types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryOverview = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
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

  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  const onFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    if (value.length === 0) {
      setFilteredValue(null);
    } else {
      const filtered =
        value.length > 0
          ? factorySite?.filter((factory: Factory) => {
              return (
                factory.factory_name
                  ?.toLowerCase()
                  .includes(value.toLowerCase()) ||
                factory?.country?.toLowerCase().includes(value.toLowerCase())
              );
            })
          : factorySite;
      setFilteredValue(filtered);
    }
  };

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

    // Confirm deletion dialog
    const confirmDeleteFactory = (factory: Factory) => {    
      setVisibleDelete(true);
      setFactoryToDelete(factory);
      setFactoryName(factory?.factory_name ?? '')
    
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

  return (
    <>
      <div className="flex">
        <div
          className={isSidebarExpand ? "sidebar-container" : "collapse-sidebar"}
        >
          <Sidebar isOpen={isSidebarExpand} setIsOpen={setSidebarExpand} />
        </div>
        <div
          className={
            isSidebarExpand
              ? "factory-container"
              : "  factory-container-collpase"
          }
        >
          <Navbar navHeader={t("overview:factoryOverview")} />
          <div>
            <OverviewHeader />
          </div>
          <div>
            <div className="factory-overview-header flex justify-content-between">
              <div className="search-container">
                <img src="/search_icon.jpg" alt="search-icon" />
                <InputText
                  className="search-input"
                  placeholder={t("placeholder:searchByFactoryCountry")}
                  value={globalFilterValue}
                  onChange={onFilter}
                />
              </div>
              <div>
                <div>
                  <img
                    src="/sort_icon.jpg"
                    alt="sort-icon"
                    
                  />
                  <Dropdown
                  className="sort-dropdown"
                    optionLabel="label"
                    placeholder={t("placeholder:sortByFactory")}
                    options={sortOptions}
                    onChange={onSortChange}
                  />
                </div>
              </div>
            </div>
            <FactoryCard />
          </div>
        </div>
      </div>
      {visible && (
        <CreateFactory visibleProp={visible} setVisibleProp={setVisible} />
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
      <Footer />
    </>
  );
};

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        "header",
        "overview",
        "placeholder",
        "dashboard",
        "button",
      ])),
    },
  };
}
export default FactoryOverview;
