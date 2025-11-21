import React, { useState, useRef, useEffect } from 'react';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FilterMatchMode } from 'primereact/api';
import { useRouter } from 'next/router';
import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem } from 'primereact/menuitem';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchAssets, setSelectedAssets, Asset } from '@/redux/assetManagement/assetManagementSlice';
import '../../styles/asset-management.css'
import { Dropdown } from 'primereact/dropdown';
import { useTranslation } from 'next-i18next';

interface Props {
  searchQuery?: string;
  productTypeFilter:string[]
  groupBy: string | null;
  sortAscending: boolean;
}
const AssetManagement: React.FC<Props> = ({ searchQuery, productTypeFilter, groupBy, sortAscending}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading, selectedAssets } = useSelector((state: RootState) => state.assetManagement);
  const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<Asset | null>(null);
  const cm = useRef<ContextMenu>(null);
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const {t} = useTranslation("overview")
  const [filteredData, setFilteredData] = useState([]);

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_serial_number: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    product_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_manufacturer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  });

  useEffect(() => {
    let temp = [...assets];
    if (searchQuery && searchQuery.trim() !== "") {
      temp = temp.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchQuery)
        )
      );
    }
    if (productTypeFilter.length > 0) {
      temp = temp.filter(item => {
        const pType = item.type?.split('/').pop();
        return pType && productTypeFilter.includes(pType);
      });
    }
    if (groupBy === "product_type") {
      temp = temp.sort((a, b) => {
        const aType = a.type?.split("/").pop() || "";
        const bType = b.type?.split("/").pop() || "";
        return aType.localeCompare(bType);
      });
    }
    temp.sort((a, b) => {
      const nameA = a.product_name?.toLowerCase() || "";
      const nameB = b.product_name?.toLowerCase() || "";
      return sortAscending
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    setFilteredData(temp);
  }, [assets, searchQuery, productTypeFilter, groupBy, sortAscending]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'] = { value: value, matchMode: FilterMatchMode.CONTAINS };
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const handleRefresh = () => {
    dispatch(fetchAssets());
  };

  const toggleExpansion = (rowData: Asset, field: keyof Asset) => {
    setExpandedRows(prevState => ({
      ...prevState,
      [`${rowData.id}-${field}`]: !prevState[`${rowData.id}-${field}`]
    }));
  };

  const renderExpandableCell = (rowData: Asset, field: keyof Asset) => {
    const value = rowData[field];
    const isExpanded = expandedRows[`${rowData.id}-${field}`];

    let displayText = '';
    if (typeof value === 'string') {
      if (isExpanded || value.length <= 16) {
        displayText = value;
      } else {
        const start = value.slice(0, 6);
        const end = value.slice(-6);
        displayText = `${start}...${end}`;
      }
    }

    const handleCopy = (e:any) => {
      e.stopPropagation();
      if (typeof value === 'string') {
        navigator.clipboard.writeText(value);
        toast.current?.show({
          severity: 'success',
          summary: 'Copied',
          detail: 'ID copied to clipboard',
          life: 2000
        });
      }
    };

    return (
      <div className="tr-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <p className={isExpanded ? "expand-id-text" : "id-text"} style={{ margin: 0 }}>{displayText}</p>

        {/* Removed expand/collapse button completely */}

        {/* Copy icon (image-based) */}
        {typeof value === 'string' && (
          <img
            src="/copy-01.svg"  // replace with your actual icon path
            alt="Copy"
            style={{ cursor: 'pointer', width: 16, height: 16 }}
            onClick={((e) => handleCopy(e))}
          />
        )}
      </div>
    );
  };


  const menuModel: MenuItem[] = [
    {
      label: 'Contracts',
      icon: 'pi pi-file-edit',
      command: () => {
        if (selectedProduct) {
          router.push(`/contracts/`);
        }
      },
      disabled: true
    },
    {
      label: 'Certificates',
      icon: 'pi pi-verified',
      command: () => {
        if (selectedProduct?.id) {
          router.push({
            pathname: "/certificates",
            query: { asset_ifric_id: selectedProduct.id },
          });
        }
      },
    },
    {
      label: 'Dashboard',
      icon: 'pi pi-chart-line',
      command: () => {
        if (selectedProduct) {
          router.push(`/factory-site/dashboard`);
        }
      }
    }
  ];

  const actionItemsTemplate = (rowData: Asset) => {
    return (
      <button
        className="context-menu-icon-btn"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          setSelectedProduct(rowData);
          cm.current?.show(e);
        }}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div><h3>...</h3></div>
      </button>
    );
  };

  return (
    <div className="asset-management-container">
      <Toast ref={toast} />
      <ContextMenu model={menuModel} ref={cm} onHide={() => setSelectedProduct(null)} />

      {loading ? (
        <div className="spinner-container">
          <ProgressSpinner />
        </div>
      ) : (
        <DataTable
          value={filteredData}
          paginator
          rows={40}
          rowsPerPageOptions={[10, 20, 40, 50]}
          dataKey="id"
          filters={filters}
          filterDisplay="menu"
          loading={loading}
          responsiveLayout="scroll"
          globalFilterFields={['id', 'asset_serial_number', 'type', 'product_name', 'asset_manufacturer_name']}
          emptyMessage={t("no_assets")}
          className="asset-table custom-paginator-table"
          selectionMode="multiple"
          selection={selectedAssets}
          onSelectionChange={(e) => dispatch(setSelectedAssets(e.value as Asset[]))}
          scrollable
          onRowClick={(asset) => asset?  router.push(`/factory-site/dashboard?asset=${asset.data.product_name}`) : undefined}
          scrollHeight="calc(100vh - 240px)"
          onContextMenu={(e) => cm.current?.show(e.originalEvent)}
          contextMenuSelection={selectedProduct as any}
          onContextMenuSelectionChange={(e) => setSelectedProduct(e.value as any)}
          paginatorTemplate={{
            layout: 'CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
            RowsPerPageDropdown: (options) => (
              <div className="custom-rows-dropdown">
                <span className="display-label">{t("display")}</span>
                <Dropdown
                  value={options.value}
                  options={[
                    { label: `10 ${t("records_per_page")}`, value: 10 },
                    { label: `20 ${t("records_per_page")}`, value: 20 },
                    { label: `30 ${t("records_per_page")}`, value: 30 },
                    { label: `40 ${t("records_per_page")}`, value: 40 },
                    { label: `50 ${t("records_per_page")}`, value: 50 },
                    { label: `100 ${t("records_per_page")}`, value: 100 },
                  ]}
                  onChange={options.onChange}
                  className="custom-dropdown"
                />

              </div>
            )
          }}
          currentPageReportTemplate={`{first} - {last} ${t("Assets")}`}
        >
          <Column
            field="icon"
            headerStyle={{ width: '30px', paddingLeft: '28px' }}
            bodyStyle={{ width: '30px', textAlign: 'center', paddingLeft: "28px" }}
            body={() => (
              <img src="/warn-img.svg" alt="icon" width={40} height={40} />
            )}
          />
          <Column
            field="product_name"
            header={t("asset_name")}
            body={(rowData: Asset) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10182B', fontFamily: '"League Spartan"', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.07px' }}>
                <img src="/asset-img.svg" alt="asset" width={28} height={28} />
                {rowData.product_name}
              </div>
            )}
          />
          <Column
            field="asset_manufacturer_name"
            header={t("manufacturer")}
            body={(rowData: Asset) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10182B', fontFamily: '"League Spartan"', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.07px' }}>
                <img src="/manufacturer-img.svg" alt="manufacturer" width={28} height={28} />
                {rowData.asset_manufacturer_name}
              </div>
            )}
          />
          <Column field="type" header={t("product_type")} body={(rowData: Asset) => rowData.type.split('/').pop()} />
          <Column field="id" header="ID" body={(rowData) => renderExpandableCell(rowData, 'id')} style={{ textAlign: 'left' }} />
          <Column field="area" header={t("area")} body="--" />
          <Column field="factory_site" header={t("factory_site")} body="--" />

          <Column body={actionItemsTemplate} headerStyle={{ width: '5rem' }} />
        </DataTable>
      )}
    </div>
  );
};

export default AssetManagement;
