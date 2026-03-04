import axios from 'axios';

export const fetchPersonality = async (url: string): Promise<string> => {
  if (!url) {
    return "Default strategy: Aggressive and balanced.";
  }
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch markdown:", error);
    return "Default strategy: Aggressive and balanced."; // Fallback text
  }
};
