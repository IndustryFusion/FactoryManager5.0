import React from "react";
import { Dropdown } from "primereact/dropdown";
import { Factory } from "@/interfaces/FactoryType";
import "../../../styles/factory-selector-dropdown.css";
interface FactorySelectorProps {
  actionType: "edit" | "delete";
  value: Factory | null;
  options: Factory[];
  onChange: (e: { value: Factory }) => void;
  onActionSelect: (actionType: "edit" | "delete") => void;
}

const FactorySelector: React.FC<FactorySelectorProps> = ({
  actionType,
  value,
  options,
  onChange,
  onActionSelect,
}) => {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      placeholder={`Select a ${
        actionType === "edit" ? "Factory to Edit" : "Factory to Delete"
      }`}
      onClick={() => onActionSelect(actionType)}
      className="custom-dropdown"
      optionLabel="factory_name"
    />
  );
};

export default FactorySelector;
