import React, { useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";

interface RelationsModalProps {
  position: { x: number; y: number };
  relations?: any;
  onSubmit: (selectedRelations: string[]) => void;
  onCancel: () => void;
}

export const RelationsModal: React.FC<RelationsModalProps> = ({
  position,
  relations,
  onSubmit,
  onCancel,
}) => {
  const [selectedRelations, setSelectedRelations] = useState<string[]>([]);
  const [relationsCount, setRelationsCount] = useState<{
    [key: string]: number;
  }>({});

  const handleCheckboxChange = (e: any) => {
    const { value, checked } = e.target;
    if (checked) {
      setSelectedRelations((prevSelected) => [...prevSelected, value]);
      // Increment the relation count
      setRelationsCount((prevCount) => ({
        ...prevCount,
        [value]: (prevCount[value] || 0) + 1,
      }));
    } else {
      setSelectedRelations((prevSelected) =>
        prevSelected.filter((relation) => relation !== value)
      );
      // Decrement the relation count
      setRelationsCount((prevCount) => ({
        ...prevCount,
        [value]: prevCount[value] - 1,
      }));
    }
  };

  const handleRelationSubmit = () => {
    onSubmit(selectedRelations);
    setSelectedRelations([]);
  };

  const handleClose = () => {
    onCancel();
    setSelectedRelations([]);
  };

  return (
    <div
      className="relations-dropdown"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y + 180,
        zIndex: 1000,
      }}
    >
      {Object.entries(relations).map(([key, value]) => (
        <div key={key} className="p-field-checkbox">
          <Checkbox
            inputId={`relation-checkbox-${key}`}
            value={key}
            onChange={handleCheckboxChange}
            checked={selectedRelations.includes(key)}
          />
          <label htmlFor={`relation-checkbox-${key}`}>{key}</label>
        </div>
      ))}
      <div>
        <Button
          label="Submit"
          onClick={handleRelationSubmit}
          className="p-button-text"
          disabled={selectedRelations.length === 0}
        />
        <Button label="Close" onClick={handleClose} className="p-button-text" />
      </div>
    </div>
  );
};
