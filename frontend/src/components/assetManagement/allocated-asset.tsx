
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
    factoryId: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [allAllocatedAssets, setAllAllocatedAssets] = useState([]);
  const [factoryName, setFactoryName] = useState("");

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


  const getFactoryDetails = async (factoryId: string) => {
    try {
      const response = await fetchFactoryDetails(factoryId);
      const factoryname = response["http://www.industry-fusion.org/schema#factory_name"]?.value;
      console.log("factoryname here", factoryname);

      setFactoryName(factoryname)
    } catch (error) {
      console.error(error);
    }
  }


  const data = allAllocatedAssets.map(item => {
    const factoryId = item.id.replace(/:allocated-assets$/, '');
    // getFactoryDetails(factoryId)
    let urnObject = item?.object;
    let dataItem = { factoryName };

    if (typeof urnObject === 'string') {
      urnObject = [urnObject];
    }

    if (urnObject.length > 0) {
      urnObject.forEach((urn, index) => {
        dataItem[`urn_${index + 1}`] = urn;
      });
    }

    return dataItem;

  });

  console.log("allocated data what's here", data);


  const maxUrnFields = data.reduce((max, item) => {
    const urnFields = Object.keys(item).filter(key => key.startsWith('urn_')).length;
    return Math.max(max, urnFields);
  }, 0);
  // Generate column definitions dynamically
  const urnColumns = Array.from({ length: maxUrnFields }, (_, i) => ({
    field: `urn_${i + 1}`,
    header: `URN ${i + 1}`,
  }));



  const handleAllAllocatedAsset = async () => {
    try {
      const response = await fetchAllAllocatedAssets();
      console.log(response, "all response allocated");
      const allocatedAssets = [];
      response.forEach(({ id, "http://www.industry-fusion.org/schema#last-data": { object } }) => {
        allocatedAssets.push({ id: id, object: object });
        const factoryId = id.replace(/:allocated-assets$/, '');
        setAllAllocatedAssets(allocatedAssets)
        getFactoryDetails(factoryId)
      });
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
        <Column header="Factory"  />
        <Column header="Assets"/>
      </Row>
    </ColumnGroup>
  )

  return (
    <>
      <h3>Allocated Assets</h3>
      <DataTable
        style={{ zoom: "92%" }}
        className="factory-table"
        value={data}
        rowGroupMode="rowspan" showGridlines
        header={header}
        headerColumnGroup={headerGroup}
        filters={filters}
        globalFilterFields={['factoryId', ...urnColumns.map(col => col.field)]}
        groupField="factoryName"
        >
        <Column 
        field="factoryName"
          className="factory-id-text"
          filter

        ></Column>
        {urnColumns.map((col, i) => (
          <Column key={col.field}
            filter
            className="factory-urn-text"
            field={col.field}

          />
        ))}
      </DataTable>
    </>
  )
}


export default AllocatedAsset;