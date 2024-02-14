import React from "react";

type SelectedAssetsListProps = {
  selectedAssets: string[];
};

const SelectedAssetsList: React.FC<SelectedAssetsListProps> = ({
  selectedAssets,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>
      {selectedAssets.map((asset, index) => (
        <div key={index} style={{ marginRight: "10px" }}>
          {asset}
        </div>
      ))}
    </div>
  );
};

export default SelectedAssetsList;
