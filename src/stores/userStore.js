// src/stores/userStore.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('userStore', {
  state: () => ({
    user: null, // { token, email, name, tokenExpiration }
    isSigningOut: false,
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.user || !state.user.token) return false;
      // Check if token is expired
      const now = new Date();
      return state.user.tokenExpiration && new Date(state.user.tokenExpiration) > now;
    },
    token: (state) => state.user ? state.user.token : null,
  },

  actions: {
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

    // Optional: Method to manually check and enforce sign-out due to inactivity
    forceSignOutDueToInactivity() {
      if (this.isAuthenticated) {
        this.signOut().then(() => {
          window.location.href = '/login'; // Force redirect after sign-out
        });
      }
    },
  },
});
