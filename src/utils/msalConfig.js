// src/msalConfig.js
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "290a8583-a358-4742-abc3-37b3e18a6225", // Your Vue app’s Client ID
    authority: "https://caleyinsurance.b2clogin.com/caleyinsurance.onmicrosoft.com/B2C_1_google", // Your user flow
    knownAuthorities: ["caleyinsurance.b2clogin.com"],
    redirectUri: window.location.origin + "/auth", // Dynamic: works for dev and prod
    // Optional: Add scopes if Function App requires custom API access
    // scopes: ["openid", "profile", "api://<function-client-id>/.default"],
  },
  cache: {
    cacheLocation: "localStorage", // Persist auth state
    storeAuthStateInCookie: false, // Set true for older browsers if needed
  },
};

// Singleton MSAL instance
let msalInstance;

// Initialize MSAL and return the instance
export async function getMsalInstance() {
  if (!msalInstance) {
    try {
      msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize(); // Required for MSAL v2.x
      console.log("MSAL initialized successfully");
    } catch (error) {
      console.error("MSAL initialization failed:", error);
      throw error; // Let caller handle
    }
  }
  return msalInstance;
}

// Export config for reference if needed (e.g., for scopes)
export { msalConfig };
