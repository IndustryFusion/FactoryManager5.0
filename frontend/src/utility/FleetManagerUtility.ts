import axios from "axios";

import { useRouter } from "next/router";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export const fetchAsset = async () => {
  try {
    const response = await axios.get(`${API_URL}/asset`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    return response.data; // Return the fetched data
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw the error to handle it in the caller
  }
};
export const createNewAsset = async (templateId: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/asset/${templateId}`,

      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );

    return response.data; // Return the created asset data
  } catch (error) {
    console.error("Error creating a new asset:", error);
    throw error; // Re-throw the error to handle it in the caller
  }
};
export function transformRelationTypeToHasFormat(relationType: any) {
  // Check if the input is valid
  if (typeof relationType !== "string" || !relationType) {
    console.error("Invalid or undefined relationType:", relationType);
    return "";
  }

  // Extract the last part of the URL after the last '/'
  const relationValue = relationType.substring(
    relationType.lastIndexOf("/") + 1
  );

  if (!relationValue) {
    console.error("Failed to extract relation value from:", relationType);
    return "";
  }

  // Convert the first character to uppercase and prepend 'has'
  const formattedRelationName = `has${
    relationValue.charAt(0).toUpperCase() + relationValue.slice(1)
  }`;

  return formattedRelationName;
}

export const updateRelationDataInLocalStorage = (newRelationData: any) => {
  const existingData = JSON.parse(localStorage.getItem("relationData") || "{}");
  const updatedData = { ...existingData, ...newRelationData };
  localStorage.setItem("relationData", JSON.stringify(updatedData));
  console.log("Updated relation data in localStorage:", updatedData);
};
export const handleEditClick = async (assetId: string) => {
  const router = useRouter();

  try {
    const response = await axios.patch(`${API_URL}/asset/${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    const assetDetails = response.data;
  } catch (error) {
    console.error("Failed to fetch asset details:", error);
  }
};
