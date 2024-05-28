
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

import { fetchAllAllocatedAssets } from "@/utility/factory-site-utility";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Row } from "primereact/row";
import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { AllocatedAssetData } from "../../types/allocated-asset-data";

const AllocatedAsset = () => {
  const [filters, setFilters] = useState<{
    global: { value: string | null; matchMode: FilterMatchMode };
  }>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [allAllocatedAssets, setAllAllocatedAssets] =  useState<AllocatedAssetData[]>([]);
  const { t } = useTranslation(['placeholder', 'reactflow']);

  // Handle global filter change
  const onGlobalFilterChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  // Render the search input for the DataTable header
  const renderHeader = () => {
    return (
      <div className="flex justify-content-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue} onChange={onGlobalFilterChange}
            placeholder={t('placeholder:search')} />
        </span>
      </div>
    );
  };
  const header = renderHeader();

// Fetch and transform data from the backend
  const handleAllAllocatedAsset = async () => {
    try {
      const response = await fetchAllAllocatedAssets();      
      let transformedArray:AllocatedAssetData[] = [];
      if(Object.keys(response).length > 0){
     
        for (let factoryName in response) {
          let obj: AllocatedAssetData = {
            factoryName: factoryName,
            assets: response[factoryName]
          }
          transformedArray.push(obj);
        }
           setAllAllocatedAssets(transformedArray)  
      }  
     
    } catch (error) {
      console.error("Error from @components/assetManagement/allocated-asset.tsx",error)
    }
  }

  useEffect(() => {
    handleAllAllocatedAsset();
  }, [])


  const headerGroup = (
    <ColumnGroup>
      <Row>
        <Column header="Factory" />
        <Column header="Assets" />
      </Row>
    </ColumnGroup>
  )

  return (
    <>
      <h3>{t('reactflow:allocatedAsset')}</h3>
      <DataTable
        style={{ zoom: "92%" }}
        className="factory-table"
        value={allAllocatedAssets}
        rowGroupMode="rowspan" showGridlines
        header={header}
        headerColumnGroup={headerGroup}
        filters={filters}
        globalFilterFields={['factoryName', 'assets']}
      >
        <Column
          field="factoryName"
          className="factory-id-text"
          filter
        ></Column>
        <Column
          field="assets"
          filter
          body={(rowData) => rowData?.assets.length > 0 && rowData?.assets?.join(', ')}
        >
        </Column>
      </DataTable>
    </>
  )
}


export default AllocatedAsset;