import React from "react";

const EdgeAddContext = React.createContext({
  onEdgeAdd: (assetId: string, relationName: any,relationClass:string) => {},
});

export default EdgeAddContext;
