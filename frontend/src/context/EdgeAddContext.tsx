import React from "react";

const EdgeAddContext = React.createContext({
  onEdgeAdd: (assetId: string, relationName: string,relationClass:string) => {},
});

export default EdgeAddContext;
