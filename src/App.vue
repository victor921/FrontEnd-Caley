<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";

const router = useRouter();
const userStore = useUserStore();

// Reactive user state
const user = computed(() => userStore.user);
const isAuthenticated = computed(() => !!user.value);
const isSigningOut = computed(() => userStore.isSigningOut);

// Inactivity timer state
const showWarning = ref(false);
const countdown = ref(60); // 1-minute warning
let inactivityTimer = null;
let countdownTimer = null;

// Constants (in milliseconds)
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION = 60 * 1000; // 1 minute

// Navigation and sign-out functions
function signOut() {
  stopInactivityTimer();
  userStore.signOut().then(() => {
    router.push("/login").then(() => {
      window.location.reload();
    });
  });
}

function navigateTo(path) {
  if (isAuthenticated.value) {
    router.push(path);
  } else {
    router.push("/login");
  }
}

// Inactivity timer logic
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  clearInterval(countdownTimer);
  showWarning.value = false;
  countdown.value = 60;

  inactivityTimer = setTimeout(() => {
    showWarning.value = true;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        signOut();
      }
    }, 1000);
  }, INACTIVITY_LIMIT - WARNING_DURATION);
}

function startInactivityTimer() {
  if (!isAuthenticated.value) return;
  window.addEventListener("mousemove", resetInactivityTimer);
  window.addEventListener("click", resetInactivityTimer);
  window.addEventListener("keypress", resetInactivityTimer);
  resetInactivityTimer();
}

function stopInactivityTimer() {
  window.removeEventListener("mousemove", resetInactivityTimer);
  window.removeEventListener("click", resetInactivityTimer);
  window.removeEventListener("keypress", resetInactivityTimer);
  clearTimeout(inactivityTimer);
  clearInterval(countdownTimer);
}

function extendSession() {
  resetInactivityTimer();
}

// Lifecycle hooks
onMounted(() => {
  userStore.loadUserFromStorage();
  startInactivityTimer();
});

onUnmounted(() => {
  stopInactivityTimer();
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
        <div class="menu-item" @click="navigateTo('/searchContact')">
          <img src="@/assets/icons/search.svg" alt="Search Contact" />
          <span>Search Contact</span>
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

    <!-- INACTIVITY WARNING MODAL -->
    <div v-if="showWarning && !isSigningOut" class="modal-overlay">
      <div class="modal-content">
        <h2>Session Timeout Warning</h2>
        <p>
          You will be signed out in {{ countdown }} seconds due to inactivity.
          Do you want to stay signed in?
        </p>
        <button @click="extendSession">Stay Signed In</button>
        <button @click="signOut">Sign Out Now</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  height: 100vh;
  font-family: "Inter", sans-serif;
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
  max-width: 80%;
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

/* INACTIVITY WARNING MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 998; /* Below sign-out overlay */
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
.modal-content button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.modal-content button:first-child {
  background: #007bff;
  color: white;
}
.modal-content button:last-child {
  background: #dc3545;
  color: white;
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
