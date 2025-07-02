import { MdLocationOn } from "react-icons/md";
import { Factory } from "../../types/factory-type";
import axios, { AxiosError } from "axios";
import { useEffect, useState, useRef } from "react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { Button } from "primereact/button";
import { TabView, TabPanel } from "primereact/tabview";
import "../../styles/factory-overview.css";
import "../../styles/factory-card.css";
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
import { Card } from "primereact/card";
import { Menu } from "primereact/menu";
import { FaCogs, FaSitemap } from "react-icons/fa";
import { FiMoreHorizontal } from "react-icons/fi";
import { Tooltip } from "primereact/tooltip";
import { ContextMenu } from "primereact/contextmenu";
import dynamic from "next/dynamic";
import { getAccessGroup } from '@/utility/indexed-db';


// Assuming you're using PrimeReact

const FactoryMap = dynamic(() => import("@/components/factoryOverview/factoryMap"), {
  ssr: false,
});

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
      const accessGroupData = await getAccessGroup();
      const response = await axios.get(API_URL + `/factory-site/company-specific/${accessGroupData.company_ifric_id}`, {
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
        showToast("error", "Error", "Getting factory lists")
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
          ? factorySite?.filter((factory: Factory) => {
            return (
              factory.factory_name?.toLowerCase().includes(value.toLowerCase()) ||
              factory?.country?.toLowerCase().includes(value.toLowerCase())
            );
          })
          : factorySite;
      setFilteredValue(filtered);
    }
  };

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

  const handleImportClick = () => {
    fileInputRef.current?.click(); // trigger hidden file input
  };

  const factoriesWithCreateCard = (filteredValue || factorySite).concat([{ isCreateCard: true } as Factory]);

  const itemTemplate = (data: Factory) => {
    const menuRef = useRef<ContextMenu>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    if ((data as any).isCreateCard) {
      return (
        <div
          className="factory-card create-factory-card cursor-pointer"
          onClick={() => setVisible(true)}
        >
          <div className="create-card-content">
            <img src="/add-square.svg" style={{ width: "29px", height: "29px" }} />
            <p className="create-card-text">Create Factory Site</p>
          </div>
        </div>
      );
    }

    const menuItems = [
      {
        label: 'View',
        icon: 'pi pi-eye',
        command: () => router.push(`/factory-site/factory-management/${data.id}`)
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => {
          setEditFactory(data.id);
          setIsEdit(true);
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => confirmDeleteFactory(data)
      }
    ];

    return (
      <div className="factory-card" ref={containerRef}>
        {/* Card clickable area */}
        <div
          className="factory-card-clickable"
          onClick={() => router.push(`/factory-site/factory-management/${data.id}`)}
          style={{ cursor: "pointer" }}
        >
          <div className="card-header">
            <div className="card-header-left">
              <img
                src={data.thumbnail || "/factory-card.svg"}
                alt={data.factory_name}
                className="factory-image"
              />
              <div className="factory-info">
                <h2 className="factory-title">{data.factory_name}</h2>
                <p className="factory-address">
                  {data.street}<br />
                  {data.zip} {data.city}<br />
                  {data.country}
                </p>
              </div>
            </div>

            <div className="card-header-right" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <span className="factory-id">
                ID-...{(data.id ?? 0).toString().padStart(3, '0').slice(-3)}
              </span>
              <div className="card-header-actions">
                <FiMoreHorizontal
                  className="more-icon cursor-pointer"
                  style={{ color: "black" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent parent click
                    menuRef.current?.show(e);
                  }}
                  data-pr-position="top"
                />
                <ContextMenu
                  model={menuItems}
                  ref={menuRef}
                  className="factory-menu"
                />
              </div>
              <Tooltip target=".more-icon" />
            </div>
          </div>

          <div className="card-details">
            <div className="detail-item">
              <p className="detail-number">{data.assets || 0}</p>
              <p className="detail-label">Assets</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start" }}>
              <div className="detail-item icon-detail">
                <img src="/floor-plan.svg" className="detail-icon" alt="Floor Plan" />
                <p className="detail-number small">{data.areas || 0}</p>
                <p className="detail-label">Areas</p>
              </div>
              <div className="detail-item icon-detail">
                <img src="/workflow-square-03.svg" className="detail-icon" />
                <p className="detail-number small">{data.production_lines || 0}</p>
                <p className="detail-label">Production Lines</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className='main_content_wrapper'>
        <div className='navbar_wrapper'>
          <Navbar navHeader="Factory Overview" />
        </div>
        <div className="dashboard-container">
          <Toast ref={toast} />
          <div className="grid py-1 px-2 factory-overview">
            <div className="col-12">

              <div className="asset-header flex justify-content-between align-items-center">

                <div className="flex align-items-center gap-4">
                  <p className="total-assets-text m-1">
                    <span className="highlighted-number-one">{factorySite.length}</span> {t("Factory Site")}
                  </p>
                  <div>
                    <TabView className="asset-tabs">
                      <TabPanel header={t("overview:Active")}></TabPanel>
                      <TabPanel header={t("overview:Drafts")}></TabPanel>
                      <TabPanel header={t("overview:Archived")}></TabPanel>
                    </TabView>
                  </div>
                </div>
                <div className="flex justify-content-end" style={{ gap: "10px" }}>
                  <Button
                    label={t("+ Create Factory")}
                    className="factory-btn"
                    onClick={() => setVisible(true)}
                  />
                  <div>
                    <Button
                      label={t("Import Assets")}
                      className="factory-btn-white"
                      onClick={handleImportClick}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      multiple // optional: allow selecting multiple files
                      accept="image/*,application/pdf" // optional: restrict file types
                    />
                  </div>
                </div>


              </div>
              <div>
                <div>
                  <FactoryMap factories={factorySite ?? []} />
                </div>

                {factorySite.length > 0 ? (
                  <div className="dataview_wrapper">
                    <DataView
                      className="data-view"
                      value={factoriesWithCreateCard}
                      itemTemplate={itemTemplate}
                      sortOrder={sortOrder}
                      sortField={sortField}
                    />
                  </div>
                ) : null}
              </div>
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

