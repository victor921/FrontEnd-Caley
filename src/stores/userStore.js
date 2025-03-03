// src/stores/userStore.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('userStore', {
  state: () => ({
    user: null, // { token, email, name, tokenExpiration }
    isSigningOut: false,
    adminList: [], // List of admin emails loaded from the server
    blacklist: []  // List of blacklisted emails loaded from the server
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.user || !state.user.token) return false;
      const now = new Date();
      return state.user.tokenExpiration && new Date(state.user.tokenExpiration) > now;
    },
    token: (state) => (state.user ? state.user.token : null),
    isAdmin: (state) => {
      if (!state.user || !state.user.email) return false;
      const email = state.user.email.toLowerCase();
      // User must be in adminList and not in blacklist
      return state.adminList.includes(email) && !state.blacklist.includes(email);
    },
  },

  actions: {
    async loadAdminList() {
      try {
        const code = process.env.VUE_APP_FUNCTION_KEY;
        const endpoint = `/api/get_file_content?path=/caley-operations-dev/Static Files/admins.json&code=${code}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        if (data) {
          // Assuming the JSON has both "admin" and "blacklist" keys
          this.adminList = data.admin ? data.admin.map(email => email.toLowerCase()) : [];
          this.blacklist = data.blacklist ? data.blacklist.map(email => email.toLowerCase()) : [];
        } else {
          this.adminList = [];
          this.blacklist = [];
        }
      } catch (err) {
        console.error('Error loading admin list:', err);
        this.adminList = [];
        this.blacklist = [];
      }
    },

    async loadUserFromStorage() {
      try {
        const raw = localStorage.getItem('userInfo');
        if (raw) {
          const userData = JSON.parse(raw);
          this.user = userData;
          const now = new Date();
          if (userData.tokenExpiration && new Date(userData.tokenExpiration) <= now) {
            await this.signOut(); // Token expired, clear it.
          } else {
            await this.loadAdminList(); // Wait for the admin list (and blacklist) to load.
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        localStorage.removeItem('userInfo');
        this.user = null;
      }
    },

    async signIn(userData) {
      this.user = userData;
      localStorage.setItem('userInfo', JSON.stringify(userData));
      // Load the admin list (and blacklist) after signing in
      await this.loadAdminList();
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

    // Optional: Method to enforce sign-out due to inactivity
    forceSignOutDueToInactivity() {
      if (this.isAuthenticated) {
        this.signOut().then(() => {
          window.location.href = '/login'; // Force redirect after sign-out
        });
      }
    },
  },
});
