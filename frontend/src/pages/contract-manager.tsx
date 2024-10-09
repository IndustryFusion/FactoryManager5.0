import React, { useEffect, useState, useRef } from 'react';
import "../styles/contract-manager.css";
import ContractHeader from '@/components/contractManager/contract-header';
import { InputText } from 'primereact/inputtext';
import { Tree } from 'primereact/tree';
import { NodeService } from '@/service/NodeService';
import ContractCards from '@/components/contractManager/contract-cards';
import { Checkbox } from 'primereact/checkbox';
import { getAllContract } from '@/utility/contract';
import { getAccessGroup } from "../utility/indexed-db";
import { Toast } from 'primereact/toast';

const ContractManager = () => {
    const [nodes, setNodes] = useState([]); 
    const [selectedKey, setSelectedKey] = useState('');
    const toast = useRef<Toast>(null);

    const fetchContract = async () => {
      try {
          const userData = await getAccessGroup();
          if (userData && userData.jwt_token) {
            const response = await getAllContract(userData.company_ifric_id);
            console.log("response for getAllContract ",response);
          } else {
              toast.current?.show({ severity: 'error', summary: 'Error', detail: 'User data or JWT not found' });
          }
      } catch (error) {
          console.error('Error fetching data:', error);
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load necessary data' });
      }
  };

    useEffect(() => {
        NodeService.getTreeNodes().then((data) => setNodes(data));
        fetchContract();
    }, []);

  return (
    <>
      <div className="flex">
        <Toast ref={toast} />
        <div className="main_content_wrapper">
          <div className="navbar_wrapper">
            <div className='flex gap-4 contract-container'>
                <div className='contract-left-container'>
                <div className="contract-search-container"> 
              <InputText
                className="contract-search-input"
                // value={globalFilterValue}
                // onChange={onFilter}
                placeholder="Search contracts"
              />
              <img 
              className="search-expand"
              src="/search_icon.svg" alt="search-icon" />
            </div>
            <div className='mt-6'>
                <h3 className='m-0 ml-1 folder-heading'>Folders</h3>
              <div className="card flex mt-1 contracts-tree">
            <Tree
            value={nodes} selectionMode="single" selectionKeys={selectedKey} onSelectionChange={(e) => setSelectedKey(e.value)}  />
            </div>
            </div>
            <div className='mt-6'>
            <h3 className='m-0 ml-1 folder-heading'>Simple Lawfirm Members</h3>
            <div className='flex gap-3'>
                <p className='card-label-grey' style={{textDecoration:"underline"}}>Select All</p>
                <p className='card-label-grey' style={{textDecoration:"underline"}}>Unselect All</p>
            </div>
            <div className='flex gap-2 align-items-center'>
                <Checkbox />
                <p className='m-0'>Ewelina</p>
            </div>
            <div className='flex gap-2 align-items-center mt-2'>
                <Checkbox />
                <p className='m-0'>Patt Member</p>
            </div>
            </div>
                </div>
                <div className='contract-right-container'>
                  <ContractHeader />
                  <ContractCards />
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContractManager