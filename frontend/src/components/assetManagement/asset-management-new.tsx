import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { fetchAssetManagement } from '@/utility/asset-utility'; 
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { FilterMatchMode } from 'primereact/api';
import { useRouter } from 'next/router';
import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem } from 'primereact/menuitem';
import '../../styles/asset-management/asset-management-table.css'; 

interface Asset {
  id: string;
  asset_serial_number: string;
  type: string;
  product_name: string;
  asset_manufacturer_name: string;
}

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Asset | null>(null);
  const cm = useRef<ContextMenu>(null);
  const toast = useRef<Toast>(null);
  const router = useRouter();

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_serial_number: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    product_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_manufacturer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  });

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const data = await fetchAssetManagement();
        setAssets(data );
        setLoading(false);
      } catch (error) {
        console.error('Error fetching assets:', error);
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'] = { value: value, matchMode: FilterMatchMode.CONTAINS };
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-content-between align-items-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText 
            value={globalFilterValue} 
            onChange={onGlobalFilterChange} 
            placeholder="Search" 
            className="p-inputtext-sm search-input"
          />
        </span>
      </div>
    );
  };

  const header = renderHeader();

  const toggleExpansion = (rowData: Asset, field: keyof Asset) => {
    setExpandedRows(prevState => ({
      ...prevState,
      [`${rowData.id}-${field}`]: !prevState[`${rowData.id}-${field}`]
    }));
  };

  const renderExpandableCell = (rowData: Asset, field: keyof Asset) => {
    const value = rowData[field];
    const isExpanded = expandedRows[`${rowData.id}-${field}`];
    const displayText = typeof value === 'string' ? (isExpanded ? value : value.slice(0, 21) + '...') : '';

    return (
      <div className="flex gap-1 justify-content-center align-items-center tr-text" style={{ width: "271px" }}>
        <p className={isExpanded ? "expand-id-text" : "id-text"}>{displayText}</p>
        {typeof value === 'string' && value.length > 21 && (
          <button onClick={() => toggleExpansion(rowData, field)} className="transparent-btn">
            <i className={`pi ${isExpanded ? 'pi-angle-up' : 'pi-angle-down'}`}></i>
          </button>
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
          cm.current?.show(e.nativeEvent);
        }}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" 
            fill="#CCCCCC"
          />
        </svg>
      </button>
    );
  };

  return (
    <div className="card">
      <Toast ref={toast} />
      <ContextMenu model={menuModel} ref={cm} onHide={() => setSelectedProduct(null)} />
      {loading ? (
        <div className="flex justify-content-center align-items-center" style={{ height: '300px' }}>
          <ProgressSpinner />
        </div>
      ) : (
        <DataTable 
          value={assets} 
          paginator 
          rows={10} 
          rowsPerPageOptions={[5, 10, 25, 50]} 
          dataKey="id"
          filters={filters}
          filterDisplay="menu"
          loading={loading}
          responsiveLayout="scroll"
          globalFilterFields={['id', 'asset_serial_number', 'type', 'product_name', 'asset_manufacturer_name']}
          header={header}
          emptyMessage="No assets found."
          className="p-datatable-sm custom-row-padding asset-dynamic-table"
          selectionMode="multiple"
          selection={selectedAssets}
          onSelectionChange={(e) => setSelectedAssets(e.value)}
          scrollable
          scrollHeight="calc(100vh - 10px)"
          onContextMenu={(e) => cm.current?.show(e.originalEvent)}
          contextMenuSelection={selectedProduct}
          onContextMenuSelectionChange={(e) => setSelectedProduct(e.value)}
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column field="id" header="Asset ID" body={(rowData) => renderExpandableCell(rowData, 'id')} />
          <Column field="asset_serial_number" header="Machine Serial Number" />
          <Column field="type" header="Asset Type" body={(rowData) => rowData.type.split('/').pop()}  />
          <Column field="product_name" header="Product Name" />
          <Column field="asset_manufacturer_name" header="Manufacturer" />
          <Column body={actionItemsTemplate} header="Action" />
        </DataTable>
      )}
    </div>
  );
};

export default AssetManagement;