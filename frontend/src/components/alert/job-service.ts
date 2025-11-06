import axios from "axios";

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
    const response = await axios.get(`${API_URL}/jobs`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return { jobs: response.data };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const getJobById = async (jobId: string): Promise<Job> => {
  try {
    const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching job:", error);
    throw error;
  }
};