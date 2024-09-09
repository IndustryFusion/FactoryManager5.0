import Sidebar from "@/components/navBar/sidebar";
import "../../styles/factory-overview.css";
import { useState } from "react";
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

const FactoryOverview = () => {
  const [isSidebarExpand, setSidebarExpand] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [factorySite, setFactorySite] = useState<Factory[]>([]);
  const [filteredValue, setFilteredValue] = useState<Factory[] | null>(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1 | null>(null);
  const [sortField, setSortField] = useState("");
  const [visible, setVisible] = useState(false);
  const [visibleDelete, setVisibleDelete] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const sortOptions = [
    { label: "A-Z", value: "factory_name" },
    { label: "Z-A", value: "!factory_name" },
  ];
  const { t } = useTranslation(["overview", "placeholder"]);

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
      <Dropdown
        optionLabel="label"
        placeholder={t('placeholder:sortByFactory')}
        options={sortOptions}
        onChange={onSortChange}
      />
      </div>
            </div>
            <FactoryCard />
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
      {visibleDelete && 
      <DeleteDialog
      deleteDialog={visibleDelete}
      setDeleteDialog={setVisibleDelete}
      handleDelete ={handleDeleteFactory}
      deleteItemName={factoryName}
      />
      }
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
