// src/stores/userStore.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('userStore', {
  state: () => ({
    user: null, // { token, email, name, tokenExpiration }
    isSigningOut: false,
    adminList: [], // List of admin emails loaded from the server
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.user || !state.user.token) return false;
      // Check if token is expired
      const now = new Date();
      return state.user.tokenExpiration && new Date(state.user.tokenExpiration) > now;
    },
    token: (state) => state.user ? state.user.token : null,
    isAdmin: (state) => {
      if (!state.user || !state.user.email) return false;
      // Compare emails case-insensitively
      return state.adminList.map(email => email.toLowerCase()).includes(state.user.email.toLowerCase());
    },
  },

  actions: {
    async loadAdminList() {
      try {
        const code = process.env.VUE_APP_FUNCTION_KEY;
        const endpoint =
          `https://dev.rocox.co/api/get_file_content?path=/caley-operations-dev/Static Files/admins.json&code=${code}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        // Expecting the file to have a structure like: { "admin": [ ...emails ] }
        if (data && Array.isArray(data.admin)) {
          this.adminList = data.admin;
        } else {
          this.adminList = [];
        }
      } catch (err) {
        console.error('Error loading admin list:', err);
        this.adminList = [];
      }
    },

    loadUserFromStorage() {
      try {
        const raw = localStorage.getItem('userInfo');
        if (raw) {
          const userData = JSON.parse(raw);
          this.user = userData;
          // Validate token expiration
          const now = new Date();
          if (userData.tokenExpiration && new Date(userData.tokenExpiration) <= now) {
            this.signOut(); // Token expired, clear it
          } else {
            // Load the admin list after successfully loading the user.
            this.loadAdminList();
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        localStorage.removeItem('userInfo');
        this.user = null;
      }
    },

    signIn(userData) {
      this.user = userData;
      localStorage.setItem('userInfo', JSON.stringify(userData));
      // Load the admin list after signing in
      this.loadAdminList();
    },

    signOut() {
      this.isSigningOut = true;
      return new Promise((resolve) => {
        setTimeout(() => {
          this.user = null;
          localStorage.removeItem("userInfo");

          // Disable Google auto-select if applicable
          if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.disableAutoSelect();
          }

          this.isSigningOut = false;
          resolve();
        }, 1500); // Duration for the sign-out overlay
      });
    },

    // Optional: Method to manually enforce sign-out due to inactivity
    forceSignOutDueToInactivity() {
      if (this.isAuthenticated) {
        this.signOut().then(() => {
          window.location.href = '/login'; // Force redirect after sign-out
        });
      }
    },
  },
});
