<!-- src/App.vue -->
<template>
  <div>
    <div v-if="isAuthenticated">
      <h2>Hello, {{ account.idTokenClaims.given_name }}!</h2>
      <p>Role: {{ userRole }}</p>
      <p>Response: {{ functionResponse }}</p>
      <button @click="callTestFunction">Call Test Function</button>
      <div v-if="isAdmin">
        <button @click="callAdminFunction">Call Admin Function</button>
      </div>
      <button @click="signOut">Sign Out</button>
    </div>
    <div v-else>
      <p>You are not signed in.</p>
      <button @click="signIn">Sign In</button>
    </div>
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
  async created() {
    try {
      this.msalInstance = await getMsalInstance(); // Initialize MSAL
      const response = await this.msalInstance.handleRedirectPromise();
      if (response) {
        this.account = response.account;
        this.token = response.idToken;
        const roleKey = Object.keys(response.idTokenClaims).find(key => key.startsWith('extension_') && key.endsWith('_Role'));
        this.userRole = response.idTokenClaims[roleKey] || "User";
        this.isAuthenticated = true;
        console.log('Token Claims:', response.idTokenClaims);
      } else {
        console.log('No redirect response, waiting for user to sign in');
      }
    } catch (error) {
      console.error('Error in created hook:', error);
      this.functionResponse = `Auth Error: ${error.message}`;
    }
  },
  methods: {
    async signIn() {
      try {
        await this.msalInstance.loginRedirect({ scopes: ["openid", "profile"] });
      } catch (error) {
        console.error('Sign-in error:', error);
        this.functionResponse = `Sign-in Error: ${error.message}`;
      }
    },
    async callTestFunction() {
      try {
        const response = await fetch("https://dev.rocox.co/api/test", {
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
        const response = await fetch("https://dev.rocox.co/api/admin", {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        this.functionResponse = (await response.json()).message;
      } catch (error) {
        this.functionResponse = `Error: ${error.message}`;
      }
    },
    async signOut() {
      try {
        await this.msalInstance.logoutRedirect();
      } catch (error) {
        console.error('Sign-out error:', error);
        this.functionResponse = `Sign-out Error: ${error.message}`;
      }
    },
  },
};
</script>
