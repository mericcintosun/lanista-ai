import axios from 'axios';

export const isUrlAllowed = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    // Block common internal IPs and localhost
    const blockedPatterns = [
      /^localhost$/,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^169\.254\.\d+\.\d+$/,
      /^::1$/,
      /^0\.0\.0\.0$/
    ];
    if (blockedPatterns.some(p => p.test(hostname)) || hostname === 'metadata.google.internal') {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
};

export const fetchPersonality = async (url: string): Promise<string> => {
  if (!url || !isUrlAllowed(url)) {
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
