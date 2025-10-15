import React, { useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Row } from "primereact/row";
import { Toast } from "primereact/toast";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import "@/styles/asset-management/allocated-assets.css";
import "../../styles/asset-management.css"
const AllocatedAsset = () => {
  const { allocatedAssets, allocatedAssetsLoading, allocatedAssetsError } = useSelector(
    (state: RootState) => state.assetManagement
  );

  const [filters, setFilters] = useState<{
    global: { value: string | null; matchMode: FilterMatchMode };
  }>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const { t } = useTranslation(['placeholder', 'reactflow', 'overview']);
  const toast = useRef<Toast>(null);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const headerGroup = (
    <ColumnGroup>
      <Row>
        <Column header={t("overview:factory")} />
        <Column header={t("overview:Assets")} />
        <Column header={t("overview:area")} />
        <Column header={t("overview:factory_site")} />
      </Row>
    </ColumnGroup>
  );

  if (allocatedAssetsLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  // Show error toast if there's an error
  if (allocatedAssetsError) {
    toast.current?.show({
      severity: 'error',
      summary: 'Error',
      detail: allocatedAssetsError,
      life: 5000
    });
  }

  return (
    <>
      <Toast ref={toast} />
      <div className="allocated-assets-container">
        <DataTable
          style={{ zoom: "92%" }}
          className="factory-table"
          value={allocatedAssets}
          rowGroupMode="rowspan"
          showGridlines
          headerColumnGroup={headerGroup}
          filters={filters}
          globalFilterFields={['factoryName', 'assets', 'area', 'factory_site']}
        >
          <Column
            field="factoryName"
            className="factory-column"
            filter
          />
          <Column
            field="assets"
            filter
            body={(rowData) => rowData?.assets.length > 0 && rowData?.assets?.join(', ')}
          />
          <Column
            field="area"
            header="Area"
          />
          <Column
            field="factory_site"
            header="Factory Site"
          />
        </DataTable>
      </div>
    </>
  );
};

export default AllocatedAsset;
