import React, { useEffect, useRef, useState } from 'react';
import { AutoComplete, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { Chip } from 'primereact/chip';
import { Asset } from '@/types/asset-types';

import "../../styles/asset-selector.css"
import Image from 'next/image';

interface AssetSelectorProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  setSelectedAsset: (asset: Asset | null) => void;
  loading: boolean;
  handleClick: (asset: Asset) => void
}

const AssetSelector = ({ assets, selectedAsset, setSelectedAsset, loading, handleClick }: AssetSelectorProps) => {
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<AutoComplete | null>(null);

  const search = (event: { query: string }) => {
    const query = event.query.toLowerCase();
    const results = assets.filter(asset =>
      asset.product_name?.toLowerCase().includes(query)
    );
    setFilteredAssets(results);
  };
  

  const clearSelection = () => {
    setSelectedAsset(null);
    setInputVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const getProductType = (name: string) => {
    if (!name) {
      return null
    }
    const lastSegment = name.split('/').pop();
    if (!lastSegment) return null;
    const spaced = lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2');
    const capitalized = spaced.replace(/\b\w/g, c => c.toUpperCase());
    return capitalized;
  }

  const handleSelect = (e: AutoCompleteSelectEvent) => {
    setSelectedAsset(e.value);
    setInputVisible(false);
  }

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!(selectedAsset)) {
      return;
    }
    handleClick(selectedAsset)
  }, [selectedAsset, loading])


  const assetItemTemplate = (asset: Asset) => {
    return (
      <div className="flex align-items-center gap-2">
        {asset.product_image !== 'NULL' ? (
          <img src={asset.product_image} alt={asset.product_name} className='asset_search_result_image' />
        ) : (
          <div className="product-no-img" style={{ width: '35px', height: '35px' }}>
            <Image src="/no-image-icon.svg" width={16} height={16} alt="Missing image"></Image>
          </div>
        )}
        <div>
          <div className="asset_search_result_title">{asset.product_name}</div>
          <div className="asset_search_result_type">{getProductType(asset.type)}</div>
        </div>
      </div>
    );
  };


  return (
    <div className="asset_selector_input_wrapper">
      {selectedAsset && !inputVisible ? (
        <div className='asset_selector_chip_template'>
          <span>{selectedAsset?.product_name}</span><span>({getProductType(selectedAsset?.type ?? 'Product Type')})</span> <Image src="/dashboard-collapse/chip_close_icon.svg" width={12} height={12} alt='Remove Asset icon' onClick={() => clearSelection()} />
        </div>
      ) : (
        <AutoComplete
        inputId='asset_selector'
          value={inputValue}
          suggestions={filteredAssets}
          completeMethod={search}
          ref={inputRef}
          field="product_name"
          onChange={(e) => setInputValue(e.value)}
          onFocus={() => search({ query: '' })}
          onSelect={(e) => {
            handleSelect(e);
            setInputValue('');
          }}
          placeholder={loading ? "Please wait.." : "Type to search and select"}
          className="asset_selector_input w-full"
          itemTemplate={assetItemTemplate}
          panelClassName='asset_selector_input_panel'
        />
      )}
    </div>
  );
};

export default AssetSelector;
