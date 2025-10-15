import axios from "axios";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export const uploadValidationFiles =async(files: any)=>{
  try{
    const response = await axios.post(`${backendUrl}/flink-deploy`, { files });
    return response.data;
  }
  catch(error: any) {
    console.error("Error uploading validation files:", error);
  }
}