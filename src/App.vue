<script setup>
import { RouterView, useRouter } from "vue-router";
import { ref, onMounted } from "vue";
import { useUserStore } from "@/stores/userStore";

const router = useRouter();
const userStore = useUserStore();

const clientId = "91719351588-ljjoae9ggl3i7n0jftrso8sbbn43uckf.apps.googleusercontent.com";
const userInfo = ref(null);
const isSigningOut = ref(false);
const isSigningIn = ref(false);
const showPopover = ref(false);
const showSignInPopup = ref(false);

const togglePopover = () => {
  showPopover.value = !showPopover.value;
};

/**
 * Load any previously stored user info (e.g., from localStorage)
 */
const loadUserFromStorage = () => {
  const storedUserInfo = localStorage.getItem("userInfo");
  if (storedUserInfo) {
    try {
      const user = JSON.parse(storedUserInfo);
      const tokenExpiration = new Date(user.tokenExpiration);
      if (new Date() < tokenExpiration) {
        userInfo.value = user;
        userStore.setUser(userInfo.value);
      } else {
        localStorage.removeItem("userInfo");
      }
    } catch (error) {
      alert(`Error found\n${error}`)
      localStorage.removeItem("userInfo");
    }
  }
};

/**
 * Wait until Google's script has fully loaded before we initialize
 */
const ensureGoogleScriptLoaded = () => {
  return new Promise((resolve) => {
    const checkGoogle = () => {
      if (window.google && window.google.accounts) {
        resolve();
      } else {
        setTimeout(checkGoogle, 100);
      }
    };
    checkGoogle();
  });
};

/**
 * Initialize the Google Sign-In button
 */
const initializeGoogleSignIn = () => {
  if (window.google) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: !!userInfo.value,
    });
    window.google.accounts.id.renderButton(
      document.querySelector(".g_id_signin"),
      {
        theme: "outline",
        size: "large",
        text: "signin_with",
      }
    );
    window.google.accounts.id.prompt();
  }
};

/**
 * Handle Google credential response
 */
const handleCredentialResponse = async (response) => {
  try {
    isSigningIn.value = true;
    // Decode the JWT token from Google's ID
    const base64Url = response.credential.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const user = JSON.parse(jsonPayload);

    // Example expiration in 1 hour
    const tokenExpiration = new Date();
    tokenExpiration.setSeconds(tokenExpiration.getSeconds() + 3600);

    userInfo.value = { ...user, tokenExpiration };

    // Persist user in localStorage
    localStorage.setItem("userInfo", JSON.stringify(userInfo.value));
    userStore.setUser(userInfo.value);

    showSignInPopup.value = false;
  } catch (error) {
    alert(`An error occurred during sign-in. Please try again.\n${error}`);
  } finally {
    isSigningIn.value = false;
  }
};

/**
 * Sign Out logic
 */
const signOut = async () => {
  isSigningOut.value = true;
  setTimeout(() => {
    window.google.accounts.id.disableAutoSelect();
    userInfo.value = null;
    userStore.clearUser();
    isSigningOut.value = false;
    localStorage.removeItem("userInfo");
    // Refresh or redirect
    window.location.reload();
  }, 2000);
};

/**
 * Attempt route navigation
 */
const handleNavigate = (path) => {
  // If not signed in, show popup
  if (!userInfo.value) {
    showSignInPopup.value = true;
  } else {
    router.push(path);
  }
};

onMounted(async () => {
  loadUserFromStorage();
  await ensureGoogleScriptLoaded();
  initializeGoogleSignIn();
});
</script>

<template>
  <div id="app">
    <!-- If the user is signed in, show the sidebar and main content -->
    <aside v-if="userInfo" class="sidebar">
      <div class="brand-section">
        <img alt="Logo" class="logo" src="@/assets/logo2.png" />
      </div>
      <nav class="menu">
        <div class="menu-item" @click="handleNavigate('/')">
          <img src="@/assets/icons/home.svg" alt="Dashboard" />
          <span>Dashboard</span>
        </div>
        <div class="menu-item" @click="handleNavigate('/runFiles')">
          <img src="@/assets/icons/run.svg" alt="Run Files" />
          <span>Run Files</span>
        </div>
        <div class="menu-item" @click="handleNavigate('/uploadFiles')">
          <img src="@/assets/icons/upload.svg" alt="Upload Files" />
          <span>Upload Files</span>
        </div>
        <div class="menu-item" @click="handleNavigate('/runHistory')">
          <img src="@/assets/icons/history.svg" alt="Run History" />
          <span>Run History</span>
        </div>
      </nav>

      <div class="signin-container">
        <!-- If user is signed in, show profile or sign out options -->
        <div v-if="userInfo">
          <div class="profile-icon-container" @click="togglePopover">
            <img
              class="profile-icon"
              :src="userInfo?.picture || '@/assets/icons/avatar.svg'"
              alt="User Avatar"
            />
          </div>
          <div v-if="showPopover" class="popover">
            <p class="user-name">{{ userInfo.email }}</p>
            <button @click="signOut" class="button signout-button">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main v-if="userInfo" class="main-content">
      <keep-alive>
        <RouterView />
      </keep-alive>
    </main>

    <!-- If NOT signed in, show a locked overlay or sign-in prompt in the sidebar area -->
    <div v-else class="locked-overlay">
      <h2>Please sign in first</h2>
      <div class="google-signin">
        <div class="g_id_signin"></div>
        <p v-if="isSigningIn" class="loading-message">Signing you in...</p>
      </div>
    </div>

    <!-- Sign Out Animation -->
    <div v-if="isSigningOut">
      <div class="signout-message">
        <div class="signout-card">
          <h2>Signing you out...</h2>
          <div class="spinner"></div>
        </div>
      </div>
    </div>

    <!-- Popup for sign-in if user tries to navigate -->
    <transition name="fade">
      <div
        v-if="showSignInPopup && !userInfo"
        class="popup-backdrop"
        @click.self="showSignInPopup = false"
      >
        <div class="popup">
          <h2>Please sign in to continue</h2>
          <div class="g_id_signin"></div>
          <p v-if="isSigningIn" class="loading-message">Signing you in...</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* General Layout */
#app {
  display: flex;
  height: 100vh;
  font-family: 'Inter', sans-serif;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  color: #333;
  border-right: 1px solid #e6e6e6;
  position: relative;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.logo {
  width: 100px;
  height: 100px;
}

.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  color: #333;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.menu-item img {
  width: 24px;
  height: 24px;
  margin-right: 1rem;
}

.menu-item:hover {
  background-color: #eef2f7;
}

.menu-item span {
  font-size: 1rem;
}

/* Sign-in container at the bottom of the sidebar */
.signin-container {
  margin-top: auto;
  padding: 1rem 0;
  text-align: center;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 1rem;
}

/* Overlay / locked area if user is not signed in */
.locked-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  color:#000000;
  padding: 2rem;
  text-align: center;
  justify-content: center;
  align-items: center;
}

.locked-overlay h2 {
  margin-bottom: 1rem;
}

/* Google Sign-In Styles */
.google-signin {
  text-align: center;
}

/* Sign Out Animation */
.signout-message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.signout-card {
  background: #606060;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.spinner {
  margin-top: 1rem;
  width: 24px;
  height: 24px;
  border: 4px solid #ccc;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Profile icon & popover */
.profile-icon-container {
  margin: 0 auto;
  cursor: pointer;
  margin-top: 1rem;
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

.popover {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  width: 200px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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

/* Popup for sign-in if user tries to navigate */
.popup-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.popup {
  background: #5b5b5b;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

/* Fade transition for popup */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* Spinner animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  #app {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e6e6e6;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    padding: 1rem;
    position: static;
  }

  .brand-section {
    margin: 0;
  }

  .logo {
    width: 60px;
    height: 60px;
  }

  .menu {
    flex-direction: row;
    justify-content: space-around;
    gap: 1rem;
    margin-bottom: 0;
  }

  .menu-item {
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
  }

  .menu-item img {
    width: 20px;
    height: 20px;
  }

  .menu-item span {
    font-size: 0.8rem;
    margin-top: 4px;
  }

  .signin-container {
    margin-top: 0;
    padding: 1rem;
  }

  .main-content {
    flex: 1;
    padding: 1rem;
  }

  .locked-overlay {
    padding: 1rem;
  }

  .popover {
    position: static;
    transform: none;
    margin-top: 1rem;
  }
}
</style>
