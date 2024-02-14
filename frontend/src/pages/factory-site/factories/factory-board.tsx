import React, { useState, useEffect } from "react";
import FactoryForm from "./factory-form";
import "primeflex/primeflex.css";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import FactoryEdit from "./edit-form";
import { Factory } from "@/interfaces/factoryType";
import {
  fetchFactoriesAndAssets,
  deleteFactory,
  updateFactory,
} from "@/utility/factory-site-utility";
import "../../../styles/factory-board.css";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";
import FactorySelector from "./factory-selector-dropdown";

const FactoryBoard: React.FC = () => {
  const [isCreateFormVisible, setIsCreateFormVisible] =
    useState<boolean>(false);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [isEditFormVisible, setIsEditFormVisible] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState("");
  const [selectedFactoryForEdit, setSelectedFactoryForEdit] =
    useState<any>(null);
  const [selectedFactoryForDelete, setSelectedFactoryForDelete] =
    useState<Factory | null>(null);

  // Fetches factory data on component mount
  useEffect(() => {
    fetchFactoryData();
  }, []);

  // Fetch factory data from the backend
  const fetchFactoryData = async () => {
    try {
      const response = await fetchFactoriesAndAssets();
      if (response && response.data) {
        setFactories(
          response.data.map((item: any) => ({
            ...item,
            factory_name:
              item["http://www.industry-fusion.org/schema#factory_name"]?.value,
            street: item["http://www.industry-fusion.org/schema#street"]?.value,
            zip: item["http://www.industry-fusion.org/schema#zip"]?.value,
            country:
              item["http://www.industry-fusion.org/schema#country"]?.value,
            thumbnail:
              item["http://www.industry-fusion.org/schema#thumbnail"]?.value,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching factories and assets", error);
    }
  };

  // Handles creation button action
  const handleCreate = () => {
    setIsCreateFormVisible(true);
  };

  // Processes selection action for edit or delete
  const handleActionSelect = async (actionType: "edit" | "delete") => {
    setCurrentAction(actionType);

    try {
      let response;
      if (actionType === "delete") {
        response = await fetchFactoriesAndAssets();
      } else {
        response = await fetchFactoriesAndAssets();
        console.log(response, "factory data");
      }

      if (response && response.data) {
        const transformedData = response.data.map((item: any) => ({
          ...item,
          factory_name:
            item["http://www.industry-fusion.org/schema#factory_name"]?.value,
        }));
        setFactories(transformedData);
      }
    } catch (error) {
      console.error(
        `Error fetching ${actionType === "delete" ? "assets" : "factories"}`,
        error
      );
    }
  };

  // Handles selecting a factory for editing
  const handleFactorySelect = (e: any, actionType: any) => {
    const factory = factories.find((f) => f.id === e.value);
    console.log("Selected factory ID:", e.value.id);
    setSelectedFactoryForEdit(e.value.id);

    setIsEditFormVisible(true);

    if (actionType == "edit") {
      setSelectedFactoryForEdit(e.value.id);

      setIsEditFormVisible(true);
      console.log("id", selectedFactoryForEdit);
    } else {
      setSelectedFactoryForDelete(e.value);
      confirmDeleteFactory(e.value);
    }
  };

  // Confirm deletion dialog
  const confirmDeleteFactory = (factory: Factory) => {
    confirmDialog({
      message: "Are you sure you want to delete this factory?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => handleDeleteFactory(factory),
    });
  };

  // Handles factory deletion
  const handleDeleteFactory = async (factoryToDelete: Factory) => {
    try {
      await deleteFactory(factoryToDelete);
      fetchFactoryData();
    } catch (error) {
      console.error("Error deleting factory", error);
    }
  };

  const onFactoryDeleteSelect = (e: { value: Factory }) => {
    if (e.value) {
      setSelectedFactoryForDelete(e.value);

      confirmDialog({
        message: "Are you sure you want to delete this factory?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        accept: () => handleDeleteFactory(e.value),
      });
    }
  };

  const saveEditedFactory = async (editedData: Factory, id: string) => {
    try {
      const response = await updateFactory(editedData, id);
      console.log("Factory updated:", response);
      fetchFactoryData();
    } catch (error) {
      console.error("Error updating factory", error);
    }
  };

  return (
    <div>
      <div className="grid align-center">
        <ConfirmDialog />
        <div className="col">
          <Button className="button " onClick={handleCreate}>
            Create
          </Button>
        </div>
        <div>Edit</div>
        <FactorySelector
          actionType="edit"
          value={selectedFactoryForEdit}
          options={factories}
          onChange={(e) => handleFactorySelect(e, "edit")}
          onActionSelect={handleActionSelect}
        />
        <div className="col"></div>
        <div className="col">
          <div className="col">
            <div>Delete</div>
            <FactorySelector
              actionType="delete"
              value={selectedFactoryForDelete}
              options={factories}
              onChange={(e) => {
                onFactoryDeleteSelect(e);
              }}
              onActionSelect={handleActionSelect}
            />
          </div>

          {isCreateFormVisible && (
            <FactoryForm
              onSave={(data: any) => console.log("Factory Data:", data)}
            />
          )}
          {isEditFormVisible && selectedFactoryForEdit && (
            <FactoryEdit
              factory={selectedFactoryForEdit}
              onSave={(editedData) =>
                saveEditedFactory(editedData, selectedFactoryForEdit.id)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FactoryBoard;
