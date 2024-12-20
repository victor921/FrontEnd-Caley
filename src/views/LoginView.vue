<template>
  <div class="google-signin">
    <div v-if="!userInfo && !isSigningOut">
      <div
      id="g_id_onload"
      :data-client_id="clientId"
      data-callback="handleCredentialResponse"
      data-context="signin"
      data-ux_mode="redirect"
      ></div>
      <h1>Please sign in to use other tabs</h1>
      <div class="g_id_signin" data-type="standard" data-size="large"></div>
      <p v-if="isSigningIn" class="loading-message">Signing you in, please wait...</p>
    </div>

    <div v-else-if="isSigningOut">
      <div class="signout-message">
        <div class="signout-card">
          <h2>Signing you out...</h2>
          <div class="spinner"></div>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="user-card">
        <h2>Welcome, {{ userInfo.name }}!</h2>
        <p>Email: {{ userInfo.email }}</p>
        <button @click="signOut" class="button signout-button">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

export default {
  data() {
    return {
      clientId: "91719351588-ljjoae9ggl3i7n0jftrso8sbbn43uckf.apps.googleusercontent.com", // Replace with your actual Google Client ID
      userInfo: null,
      isSigningOut: false,
      isSigningIn: false,
      idleTimeout: null,
      isGoogleSignInInitialized: false,
    };
  },
  mounted() {
    this.loadUserFromStorage();
    this.initializeGoogleSignIn();
  },
  methods: {
    loadUserFromStorage() {
      const storedUserInfo = localStorage.getItem("userInfo");
      if (storedUserInfo) {
        try {
          const userInfo = JSON.parse(storedUserInfo);
          const tokenExpiration = new Date(userInfo.tokenExpiration);
          if (new Date() < tokenExpiration) {
            this.userInfo = userInfo;
            userStore.setUser(this.userInfo);
            this.startIdleTimer();
          } else {
            console.warn("Token expired. Clearing user data.");
            localStorage.removeItem("userInfo");
          }
        } catch (error) {
          console.error("Error parsing stored user info:", error);
          localStorage.removeItem("userInfo");
        }
      }
    },
    initializeGoogleSignIn() {
      if (this.isGoogleSignInInitialized || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse,
        auto_select: !!this.userInfo,
      });

      window.google.accounts.id.renderButton(document.querySelector(".g_id_signin"), {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });

      window.google.accounts.id.prompt();
      this.isGoogleSignInInitialized = true;
    },
    async handleCredentialResponse(response) {
      try {
        this.isSigningIn = true;

        const base64Url = response.credential.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );

        const userInfo = JSON.parse(jsonPayload);

        // Add token expiration (example: token valid for 1 hour)
        const tokenExpiration = new Date();
        tokenExpiration.setSeconds(tokenExpiration.getSeconds() + 3600);
        this.userInfo = { ...userInfo, tokenExpiration };

        localStorage.setItem("userInfo", JSON.stringify(this.userInfo));
        userStore.setUser(this.userInfo);
        this.startIdleTimer();
      } catch (error) {
        console.error("Error decoding user info:", error);
        alert("An error occurred during sign-in. Please try again.");
      } finally {
        this.isSigningIn = false;
      }
    },
    async signOut() {
      this.isSigningOut = true;
      setTimeout(() => {
        window.google.accounts.id.disableAutoSelect();
        this.userInfo = null;
        userStore.clearUser();
        this.isSigningOut = false;
        localStorage.removeItem("userInfo");
        this.initializeGoogleSignIn();
      }, 2000);
    },
    startIdleTimer() {
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout);
      }
      this.idleTimeout = setTimeout(() => {
        this.signOut();
        alert("You have been signed out due to inactivity.");
      }, 30 * 60 * 1000); // 30 minutes
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

.user-card {
  background: #ffffff;
  border: 1px solid #ddd;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 20px;
  width: 300px;
  text-align: center;
}

.user-card h2 {
  font-size: 20px;
  color: #007bff;
  margin-bottom: 10px;
}

.user-card p {
  font-size: 14px;
  color: #555;
  margin-bottom: 5px;
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

.signout-message {
  text-align: center;
}

.signout-card {
  background: #ffffff;
  border: 1px solid #ddd;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 20px;
  width: 300px;
  margin: 0 auto;
}

.spinner {
  margin-top: 20px;
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  border-top: 4px solid #007bff;
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
