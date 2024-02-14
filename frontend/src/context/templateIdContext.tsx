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
