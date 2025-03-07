<!-- src/App.vue (snippet) -->
<template>
  <div v-if="isAuthenticated">
    <h2>Hello, {{ account?.name }}!</h2>
    <p>Role: {{ userRole }}</p>
    <p>Response: {{ functionResponse }}</p>
    <button @click="callTestFunction">Call Test Function</button>
    <div v-if="isAdmin">
      <button @click="callAdminFunction">Call Admin Function</button>
    </div>
    <button @click="signOut">Sign Out</button>
  </div>
</template>

<script>
import { getMsalInstance } from "./utils/msalConfig";

export default {
  data() {
    return {
      isAuthenticated: false,
      account: null,
      token: null,
      userRole: "User",
      functionResponse: null,
      msalInstance: null,
    };
  },
  computed: {
    isAdmin() {
      return this.userRole === "Admin";
    },
  },
// src/App.vue (snippet)
async created() {
  try {
    this.msalInstance = await getMsalInstance(); // Await ensures initialization
    const response = await this.msalInstance.handleRedirectPromise();
    if (response) {
      this.account = response.account;
      this.token = response.idToken;
      const roleKey = Object.keys(response.idTokenClaims).find(key => key.startsWith('extension_') && key.endsWith('_Role'));
      this.userRole = response.idTokenClaims[roleKey] || "User";
      this.isAuthenticated = true;
      console.log('Token Claims:', response.idTokenClaims);
    } else {
      console.log('No redirect response, user not authenticated yet');
      // Optional: Trigger login if not authenticated
      if (!this.isAuthenticated) {
        await this.msalInstance.loginRedirect({ scopes: ["openid", "profile"] });
      }
    }
  } catch (error) {
    console.error('Error in created hook:', error);
    this.functionResponse = `Auth Error: ${error.message}`;
  }
},
  methods: {
    async callTestFunction() {
      try {
        const response = await fetch("http://localhost:7071/api/test", {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        this.functionResponse = (await response.json()).message;
      } catch (error) {
        this.functionResponse = `Error: ${error.message}`;
      }
    },
    async callAdminFunction() {
      try {
        const response = await fetch("https://<your-function-app>.azurewebsites.net/api/admin", {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        this.functionResponse = (await response.json()).message;
      } catch (error) {
        this.functionResponse = `Error: ${error.message}`;
      }
    },
    async signOut() {
      await this.msalInstance.logoutRedirect();
    },
  },
};
</script>
