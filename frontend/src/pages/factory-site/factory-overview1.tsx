
import "../../styles/factory-overview.css";
import { useRef, useState, useEffect } from "react";
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
import { FiCopy, FiEdit3 } from "react-icons/fi";
import { RiDeleteBinLine } from "react-icons/ri";
import { IoEyeOutline } from "react-icons/io5";
import dynamic from "next/dynamic";

const FactoryMap = dynamic(() => import("@/components/factoryOverview/factoryMap"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryOverview1 = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const router = useRouter();
  const { t } = useTranslation(['overview', 'placeholder']);
  const [factorySite, setFactorySite] = useState<Factory[]>([]);
  const [factoryCount, setFactoryCount] = useState(0);
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchFactoryLists(); // You likely want to load this on mount
  }, []);

  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity, summary, detail: message, life: 5000 });
  };

  const onFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilteredValue(value
      ? factorySite.filter(factory =>
          factory.factory_name?.toLowerCase().includes(value.toLowerCase()) ||
          factory.country?.toLowerCase().includes(value.toLowerCase())
        )
      : null
    );
  };

  const onSortChange = (event: DropdownChangeEvent) => {
    const value = event.value;
    setSortOrder(value.startsWith('!') ? -1 : 1);
    setSortField(value.startsWith('!') ? value.substring(1) : value);
    setSortKey(value);
  };

  const confirmDeleteFactory = (factory: Factory) => {
    setVisibleDelete(true);
    setFactoryToDelete(factory);
    setFactoryName(factory.factory_name ?? '');
  };

  const fetchFactoryLists = async () => {
    try {
      const response = await axios.get(`${API_URL}/factory-site`, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        withCredentials: true,
      });
      const mappedData = mapBackendDataToFactoryLists(response.data);
      setFactorySite(mappedData);
      setFactoryCount(mappedData.length);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast("error", "Error", "Getting factory lists");
      }
    }
  };

  const mapBackendDataToFactoryLists = (backendData: Asset[]): Factory[] => {
    return backendData.map((item: any) => {
      const newItem: any = {};
      for (const key in item) {
        if (key.includes("http://www.industry-fusion.org/schema#")) {
          const newKey = key.replace("http://www.industry-fusion.org/schema#", "");
          newItem[newKey] = item[key].type === "Property" ? item[key].value : item[key];
        } else {
          newItem[key] = item[key];
        }
      }
      return newItem;
    });
  };

  const handleDeleteFactory = async () => {
    if (!factoryToDelete) return;
    try {
      await deleteFactory(factoryToDelete);
      dispatch(reset());
      await fetchFactoryLists();
      setVisibleDelete(false);
      showToast("success", "Success", "Factory deleted successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast("error", "Error", "Deleting factory");
      }
    }
  };

  return (
    <>
      <div className="flex">
        <div className={isSidebarExpand ? "sidebar-container" : "collapse-sidebar"}>
        </div>
        <div className={isSidebarExpand ? "factory-container" : "factory-container-collpase"}>
          <Navbar navHeader={t("overview:factoryOverview")} />
          <OverviewHeader
            factoryCount={factoryCount}
            setVisible={setVisible}
            assetManageDialog={assetManageDialog}
            setAssetManageDialog={setAssetManageDialog}
          />
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
              <img src="/sort_icon.jpg" alt="sort-icon" />
              <Dropdown
                className="sort-dropdown"
                optionLabel="label"
                placeholder={t("placeholder:sortByFactory")}
                options={[
                  { label: "A-Z", value: "factory_name" },
                  { label: "Z-A", value: "!factory_name" },
                ]}
                onChange={onSortChange}
              />
            </div>
          </div>
          <FactoryCard
            menuModel={[
              {
                label: "Edit",
                icon: <FiEdit3 />,
                command: () => setIsEdit(true),
              },
              {
                label: "Delete",
                icon: <RiDeleteBinLine />,
                command: () => {
                  if (factorySite.length > 0) confirmDeleteFactory(factorySite[0]); // Replace with selected factory
                },
              },
              {
                label: "View",
                icon: <IoEyeOutline />,
                command: () => {
                  if (factorySite.length > 0)
                    router.push(`/factory-site/factory-management/${factorySite[0].id}`);
                },
              },
            ]}
          />
          <div>
            <FactoryMap/>
          </div>
        
        </div>
      </div>

      {visible && (
        <CreateFactory visibleProp={visible} setVisibleProp={setVisible} />
      )}
      {isEdit && (
        <EditFactory factory={editFactory} isEditProp={isEdit} setIsEditProp={setIsEdit} />
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

export default FactoryOverview1;
