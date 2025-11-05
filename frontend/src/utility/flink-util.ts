import axios from "axios";

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

    const response = await axios.post(`${backendUrl}/jobs/create`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
  catch(error: any) {
    console.error("Error uploading validation files:", error);
  }
}