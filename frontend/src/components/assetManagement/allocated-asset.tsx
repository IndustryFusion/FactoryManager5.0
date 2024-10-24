
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

import { useRef, useState } from "react";
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
  const { t } = useTranslation(['placeholder', 'reactflow']);
  const toast = useRef<Toast>(null);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-content-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('placeholder:search')}
          />
        </span>
      </div>
    );
  };

  const headerGroup = (
    <ColumnGroup>
      <Row>
        <Column header="Factory" />
        <Column header="Assets" />
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
      header={renderHeader()}
      headerColumnGroup={headerGroup}
      filters={filters}
      globalFilterFields={['factoryName', 'assets']}
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
      </DataTable>
    </div>
    </>
  );
};

export default AllocatedAsset;