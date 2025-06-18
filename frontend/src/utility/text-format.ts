import { showToast } from "./toast";

export const copyToClipboard = async (text: string, toast: any) => {
    try {
        await navigator.clipboard.writeText(text);
        showToast(toast, "success", "Copied", "IFRIC ID copied to clipboard");
    } catch (error) {
        showToast(toast, "error", "Error", "Failed to copy text");
    }
};