<template>
  <div>
    <!-- Google Sign-In -->
    <div v-if="!userInfo && !isSigningOut" class="google-signin">
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

    <!-- Sign Out Animation -->
    <div v-else-if="isSigningOut">
      <div class="signout-message">
        <div class="signout-card">
          <h2>Signing you out...</h2>
          <div class="spinner"></div>
        </div>
      </div>
    </div>

    <!-- Profile Icon -->
    <div v-else>
      <div class="profile-icon-container" @click="togglePopover">
        <img
          class="profile-icon"
          :src="userInfo?.picture || "
          alt="User Avatar"
        />
      </div>

      <!-- Popover with Logout Option -->
      <div v-if="showPopover" class="popover">
        <p class="user-name">{{ userInfo.email }}</p>
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
      showPopover: false, // Control for popover visibility
    };
  },
  mounted() {
    this.loadUserFromStorage();
    this.initializeGoogleSignIn();
  },
  methods: {
    togglePopover() {
      this.showPopover = !this.showPopover;
    },
    loadUserFromStorage() {
      const storedUserInfo = localStorage.getItem("userInfo");
      if (storedUserInfo) {
        try {
          const userInfo = JSON.parse(storedUserInfo);
          const tokenExpiration = new Date(userInfo.tokenExpiration);
          if (new Date() < tokenExpiration) {
            this.userInfo = userInfo;
            userStore.setUser(this.userInfo);
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
        window.location.reload(); // Refresh the page on sign out
      }, 2000);
    },
  },
};
</script>

<style scoped>
/* Profile Icon Container */
.profile-icon-container {
  position: fixed;
  top: 20px;
  right: 20px;
  cursor: pointer;
  z-index: 1000;
}

.profile-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #ddd;
  transition: transform 0.3s ease;
}

.profile-icon:hover {
  transform: scale(1.1);
}

/* Popover */
.popover {
  position: fixed;
  top: 80px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 10px;
  width: 200px;
  z-index: 1000;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.button.signout-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.button.signout-button:hover {
  background-color: #d32f2f;
}
</style>
