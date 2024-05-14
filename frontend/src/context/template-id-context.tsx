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


// contexts/TemplateIdContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

type TemplateIdContextType = {
  templateId: string | null;
  setTemplateId: (id: string | null) => void;
};

const TemplateIdContext = createContext<TemplateIdContextType | undefined>(
  undefined
);

export const useTemplateId = () => {
  const context = useContext(TemplateIdContext);
  if (context === undefined) {
    throw new Error("useTemplateId must be used within a TemplateIdProvider");
  }
  return context;
};

export const TemplateIdProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [templateId, setTemplateId] = useState<string | null>(null);

  return (
    <TemplateIdContext.Provider value={{ templateId, setTemplateId }}>
      {children}
    </TemplateIdContext.Provider>
  );
};
