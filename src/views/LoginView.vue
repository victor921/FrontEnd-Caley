<template>
  <div class="google-signin">
    <div v-if="!userInfo && !isSigningOut">
      <!-- Render Google Sign-In button when user is not signed in -->
      <div id="g_id_onload"
           :data-client_id="clientId"
           data-callback="handleCredentialResponse"
           data-context="signin"
           data-ux_mode="popup">
      </div>
      <div class="g_id_signin" data-type="standard" data-size="large"></div>
    </div>
    <div v-else-if="isSigningOut">
      <!-- Show signing out message -->
      <div class="signout-message">
        <h2>Signing you out...</h2>
        <div class="spinner"></div>
      </div>
    </div>
    <div v-else>
      <!-- Greet the signed-in user -->
      <div class="welcome-container">
        <h2>Welcome, {{ userInfo.name }}!</h2>
        <img :src="userInfo.picture" alt="Profile Picture" class="profile-picture" />
        <button @click="signOut" class="button signout-button">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useUserStore } from '@/stores/userStore';

// Access the store
const userStore = useUserStore();
export default {
  data() {
    return {
      clientId: "91719351588-ljjoae9ggl3i7n0jftrso8sbbn43uckf.apps.googleusercontent.com", // Replace with your actual Google Client ID
      userInfo: null, // Holds user data if signed in
      isSigningOut: false, // Track if the user is signing out
      idleTimeout: null, // Reference for idle timeout
    };
  },
  mounted() {
    // Check if a session exists in localStorage
    const savedUser = localStorage.getItem("userInfo");
    if (savedUser) {
      this.userInfo = JSON.parse(savedUser); // Restore user info from storage
    }

    // Initialize Google Sign-In and auto-select session
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse,
        auto_select: true, // Automatically sign in if user is already authenticated
      });

      // Render Google Sign-In button if user isn't signed in
      window.google.accounts.id.renderButton(
        document.querySelector('.g_id_signin'),
        { theme: 'outline', size: 'large', text: 'signin_with' }
      );

      // Prompt to restore session if possible
      window.google.accounts.id.prompt();
    }
  },
  methods: {
    // Handle Google Sign-In response
    handleCredentialResponse(response) {
      try {
        // Decode JWT token to extract user information
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        this.userInfo = JSON.parse(jsonPayload); // Save user data (name, picture, email, etc.)
        localStorage.setItem("userInfo", JSON.stringify(this.userInfo)); // Persist user data
        console.log("User Info:", this.userInfo);
        userStore.setUser(this.userInfo);
        // Set idle timeout
        this.startIdleTimer();
      } catch (error) {
        console.error("Error decoding user info:", error);
      }
    },
    // Sign out the user
    async signOut() {
      this.isSigningOut = true; // Set signing out state
      setTimeout(() => {
        window.google.accounts.id.disableAutoSelect(); // Disable automatic sign-in
        this.userInfo = null; // Clear user data
        userStore.clearUser();
        this.isSigningOut = false; // Reset signing out state
        localStorage.removeItem("userInfo"); // Remove user info from storage
        console.log("User signed out.");
        location.reload(); // Reload the page after signing out
      }, 2000); // Delay to show signing out message
    },
    // Start idle timeout to log out user after inactivity
    startIdleTimer() {
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout); // Reset existing timeout
      }
      this.idleTimeout = setTimeout(() => {
        this.signOut();
        alert("You have been signed out due to inactivity.");
      }, 30 * 60 * 1000); // 30 minutes of inactivity
    },
  },
};
</script>

<style scoped>
.google-signin {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
  font-family: Arial, sans-serif;
  color: #333;
}

.g_id_signin {
  margin-top: 20px;
}

h2 {
  color: #4caf50;
  margin-bottom: 10px;
}

button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #45a049;
}

button.signout-button {
  background-color: #f44336;
}

button.signout-button:hover {
  background-color: #d32f2f;
}

.welcome-container {
  text-align: center;
}

.profile-picture {
  margin-top: 10px;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.signout-message {
  text-align: center;
}

.spinner {
  margin-top: 10px;
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  border-top: 4px solid #4caf50;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
