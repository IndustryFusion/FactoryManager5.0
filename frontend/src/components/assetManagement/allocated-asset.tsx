
import { fetchAllAllocatedAssets, fetchFactoryDetails } from "@/utility/factory-site-utility";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Row } from "primereact/row";
import { useEffect, useState } from "react";

const AllocatedAsset = () => {
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },

  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const assetObj = {
    "KFC": ["prod_1", "theFcat"],
    "KCF#": ["prod_3", "theFcatoui"],
    "factory3": ["asset1"],
    "factory4": ["asset1", "asset2"]
  }
  const [allAllocatedAssets, setAllAllocatedAssets] = useState([]);


  const onGlobalFilterChange = (e) => {
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
            value={globalFilterValue} onChange={onGlobalFilterChange}
            placeholder="Search" />
        </span>
      </div>
    );
  };
  const header = renderHeader();

  console.log("allAllocatedAssets", allAllocatedAssets);

  //transform data from backend




  const handleAllAllocatedAsset = async () => {
    try {
      const response = await fetchAllAllocatedAssets();
      console.log(response, "all response allocated"); 
      let transformedArray = [];
      if(Object.keys(response).length > 0){
     
        for (let factoryName in response) {
          let obj = {
            factoryName: factoryName,
            assets: response[factoryName]
          }
          transformedArray.push(obj);
        }
           setAllAllocatedAssets(transformedArray)  
        console.log("transformedArray", transformedArray);
      }  
     
    } catch (error) {
      console.error(error)
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
      <h3>Allocated Assets</h3>
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
          body={(rowData) => rowData.assets.join(', ')}
        >
        </Column>
      </DataTable>
    </>
  )
}


export default AllocatedAsset;