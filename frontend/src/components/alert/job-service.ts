import axios from "axios";
import api from "@/utility/jwt";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export interface Job {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  knowledgeUrl: string;
  shaclUrl: string;
  createdAt: string;
  updatedAt: string;
}

export const getJobs = async (): Promise<{ jobs: Job[] }> => {
  try {
    const response = await api.get(`${API_URL}/jobs`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return { jobs: response.data };
  } catch (error) {
    throw error;
  }
};

export const getJobById = async (jobId: string): Promise<Job> => {
  try {
    const response = await api.get(`${API_URL}/jobs/${jobId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};