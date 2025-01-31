<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";

const router = useRouter();
const userStore = useUserStore();

// Reactive user state
const user = computed(() => userStore.user);
const isAuthenticated = computed(() => !!user.value);

// For sign-out overlay
const isSigningOut = computed(() => userStore.isSigningOut);

/**
 * signOut() calls the store action to clear user data
 * and then redirects to the login page.
 */
function signOut() {
  userStore.signOut().then(() => {
    // After signOut action completes, navigate to login
    router.push("/login").then(() => {
      // Optionally, force a full reload to ensure all state is cleared
      window.location.reload();
    });
  });
}

/**
 * navigateTo navigates to a path if authenticated,
 * else redirects to login.
 */
function navigateTo(path) {
  if (isAuthenticated.value) {
    router.push(path);
  } else {
    router.push("/login");
  }
}

// Load user from storage on app startup
onMounted(() => {
  userStore.loadUserFromStorage();
});
</script>

<template>
  <div id="app">
    <!-- SIDEBAR for authenticated users -->
    <aside v-if="isAuthenticated" class="sidebar">
      <!-- BRAND SECTION -->
      <div class="brand-section">
        <img alt="Company Logo" class="logo" src="@/assets/logo2.png" />
      </div>

      <!-- MENU ITEMS -->
      <nav class="menu">
        <div class="menu-item" @click="navigateTo('/home')">
          <img src="@/assets/icons/home.svg" alt="Dashboard" />
          <span>Home</span>
        </div>
        <div class="menu-item" @click="navigateTo('/runFiles')">
          <img src="@/assets/icons/run.svg" alt="Run Files" />
          <span>Run Files</span>
        </div>
        <div class="menu-item" @click="navigateTo('/uploadFiles')">
          <img src="@/assets/icons/upload.svg" alt="Upload Files" />
          <span>Upload Files</span>
        </div>
        <div class="menu-item" @click="navigateTo('/runHistory')">
          <img src="@/assets/icons/history.svg" alt="Run History" />
          <span>Run History</span>
        </div>
        <div class="menu-item" @click="navigateTo('/settings')">
          <img src="@/assets/icons/settings.svg" alt="Settings" />
          <span>Settings</span>
        </div>
      </nav>

      <!-- SIGN OUT ICON AT BOTTOM LEFT -->
      <div class="signout-container" @click="signOut">
        <img src="@/assets/icons/logout.svg" alt="Logout Icon" />
        <span>Sign Out</span>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main :class="['main-content', { 'full-width': !isAuthenticated }]">
      <router-view />
    </main>

    <!-- SIGN OUT OVERLAY -->
    <div v-if="isSigningOut" class="signout-message">
      <div class="signout-card">
        <h2>Signing you out...</h2>
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  height: 100vh;
  font-family: 'Inter', sans-serif;
}

/* SIDEBAR */
.sidebar {
  width: 250px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  color: #333;
  border-right: 1px solid #e6e6e6;
  justify-content: space-between;
  padding: 1rem;
}
.brand-section {
  text-align: center;
  margin-bottom: 1rem;
}
.logo {
  max-width: 80%; /* ~20% smaller */
  height: auto;
  display: inline-block;
}

/* MENU */
.menu {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.menu-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #333;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}
.menu-item:hover {
  background-color: #f5f5f5;
}
.menu-item img {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}
.menu-item span {
  font-size: 0.95rem;
  font-weight: 500;
}

/* SIGN OUT ICON AT BOTTOM */
.signout-container {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.signout-container:hover {
  background-color: #f5f5f5;
}
.signout-container img {
  width: 24px;
  height: 24px;
}
.signout-container span {
  font-size: 0.95rem;
  font-weight: 500;
  color: #dc3545;
}

/* MAIN CONTENT */
.main-content {
  flex: 1;
  background-color: #f7f9fa;
  padding: 1rem;
}
.full-width {
  width: 100%;
  margin: 0 auto;
}

/* SIGN OUT OVERLAY */
.signout-message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
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
.signout-card h2 {
  color: #fff;
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
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* RESPONSIVE for narrower screens */
@media (max-width: 768px) {
  #app {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e6e6e6;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
  }
  .brand-section {
    margin-bottom: 0;
  }
  .menu {
    flex-direction: row;
    justify-content: space-around;
    gap: 1rem;
    margin: 0;
  }
  .menu-item {
    flex-direction: column;
    align-items: center;
  }
  .menu-item img {
    margin: 0 0 4px 0;
  }
  .signout-container {
    margin-top: 0;
  }
  .main-content {
    padding: 1rem;
  }
}
</style>
