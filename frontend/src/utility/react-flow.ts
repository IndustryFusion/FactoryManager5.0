import axios from "axios";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export const handleUpdateRelations = async (payload: Payload) => {
    const url = `${API_URL}/asset/update-relation`;
    try {
        const response = await axios.patch(url, payload, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            withCredentials: true,
        })

        if (response.data?.status === 204 && response.data?.success === true) {
            if (deleteRelation) {

                showToast("success", "success", "Relation deleted successfully");
            } else {
                showToast("success", "success", "Relations saved successfully");
            }

        }
    }catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error response:", error.response?.data.message);
        showToast('error', 'Error', "Updating relations");
        } 
    }
}