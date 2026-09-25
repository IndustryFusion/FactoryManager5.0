import axios from "axios";
import api from "@/utility/jwt";

import { notifyError } from "@/utility/global-toast";
import { logHandledError } from "@/utility/log";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export const uploadValidationFiles =async(files: any)=>{
  try{
    const formData = new FormData();
    files.forEach((file: File) => {
      if (file.name === 'shacl.ttl') {
        formData.append("shacl", file);
      } else if (file.name === 'knowledge.ttl') {
        formData.append("knowledge", file);
      }
    });

    const response = await api.post(`${backendUrl}/jobs/create`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
  catch(error: any) {
    logHandledError("Error uploading validation files:", error);
    notifyError("Upload failed", error, "Could not upload the validation files.");
  }
}