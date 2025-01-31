// src/stores/userStore.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('userStore', {
  state: () => ({
    user: null, // { token, email, name, tokenExpiration }
    isSigningOut: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    loadUserFromStorage() {
      try {
        const raw = localStorage.getItem('userInfo')
        if (raw) {
          const userData = JSON.parse(raw)
          // Optionally, validate token expiration
          this.user = userData
        }
      } catch (err) {
        console.error('Error loading user:', err)
        localStorage.removeItem('userInfo')
        this.user = null
      }
    },

    signIn(userData) {
      this.user = userData
      localStorage.setItem('userInfo', JSON.stringify(userData))
    },

    signOut() {
      this.isSigningOut = true
      return new Promise((resolve) => {
        setTimeout(() => {
          this.user = null
          localStorage.removeItem("userInfo")

          // Disable Google auto-select if applicable
          if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.disableAutoSelect()
          }

          this.isSigningOut = false
          resolve()
        }, 1500) // Duration for the sign-out overlay
      })
    },
  },
})
