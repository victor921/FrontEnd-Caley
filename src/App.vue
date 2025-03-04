<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";

const router = useRouter();
const userStore = useUserStore();

// Reactive user state
const user = computed(() => userStore.user);
const isAuthenticated = computed(() => !!user.value);
const isAdmin = computed(() => userStore.isAdmin);
const isSigningOut = computed(() => userStore.isSigningOut);

// Inactivity timer state
const showWarning = ref(false);
const countdown = ref(60); // 1-minute warning
let inactivityTimer = null;
let countdownTimer = null;

// Constants (in milliseconds)
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION = 60 * 1000; // 1 minute

// Sidebar collapse/expand logic
const isSidebarExpanded = ref(false);
let sidebarTimer = null;

function handleSidebarMouseEnter() {
  sidebarTimer = setTimeout(() => {
    isSidebarExpanded.value = true;
  }, 1000); // Expand after 1 second of hover
}

function handleSidebarMouseLeave() {
  clearTimeout(sidebarTimer);
  isSidebarExpanded.value = false;
}

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
    <aside
      v-if="isAuthenticated"
      :class="['sidebar', { expanded: isSidebarExpanded }]"
      @mouseenter="handleSidebarMouseEnter"
      @mouseleave="handleSidebarMouseLeave"
    >
      <!-- Brand Section -->
      <div class="brand-section">
        <img alt="Company Logo" class="logo" src="@/assets/logo2.png" />
      </div>

      <!-- Spacer to center menu -->
      <div class="spacer"></div>

      <!-- Menu Items -->
      <nav class="menu">
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/home')">
          <img src="@/assets/icons/home.svg" alt="Home" />
          <span>Home</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/runFiles')">
          <img src="@/assets/icons/run.svg" alt="Run Files" />
          <span>Run Files</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/fileManagement')">
          <img src="@/assets/icons/upload.svg" alt="File Management" />
          <span>File Management</span>
        </div>
        <div class="menu-item" @click="navigateTo('/searchContact')">
          <img src="@/assets/icons/search.svg" alt="Search Contact" />
          <span>Search Contact</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/runHistory')">
          <img src="@/assets/icons/history.svg" alt="Run History" />
          <span>Run History</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/settings')">
          <img src="@/assets/icons/settings.svg" alt="Settings" />
          <span>Settings</span>
        </div>
      </nav>

      <!-- Spacer to push sign-out to bottom -->
      <div class="spacer"></div>

      <!-- Sign Out -->
      <div class="signout-container" @click="signOut">
        <img src="@/assets/icons/logout.svg" alt="Sign Out" />
        <span>Sign Out</span>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main
      :class="['main-content', { 'full-width': !isAuthenticated }]"
      :style="{ marginLeft: isAuthenticated ? (isSidebarExpanded ? '200px' : '70px') : '0' }"
    >
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
        <button @click="extendSession" class="btn primary">Stay Signed In</button>
        <button @click="signOut" class="btn danger">Sign Out Now</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  height: 100vh;
  font-family: "Inter", sans-serif;
  background: #f5f7fa;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 70px; /* Collapsed width */
  background: #ffffff;
  color: #333;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  transition: width 0.3s ease;
  z-index: 1000;
}

.sidebar.expanded {
  width: 200px; /* Expanded width */
}

/* Brand Section */
.brand-section {
  text-align: center;
  padding: 0 0.5rem;
  margin-bottom: 1rem;
}

.logo {
  width: 50px; /* Collapsed size */
  height: auto;
  transition: width 0.3s ease;
}

.sidebar.expanded .logo {
  width: 80px; /* Expanded size */
}

/* Spacer */
.spacer {
  flex: 1; /* Equal spacers center the menu */
}

/* Menu */
.menu {
  display: flex;
  flex-direction: column;
  gap: 0.75rem; /* Close spacing for menu items */
  align-items: center;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem; /* Larger click area */
  cursor: pointer;
  transition: background 0.2s ease;
  width: 100%; /* Full width for click area */
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item img {
  width: 24px;
  height: 24px;
  margin-right: 0; /* No margin when collapsed */
  transition: margin-right 0.2s ease;
}

.sidebar.expanded .menu-item img {
  margin-right: 1rem; /* Margin when expanded */
}

.menu-item span {
  font-size: 0.95rem;
  font-weight: 500;
  color: #2d3748;
  opacity: 0; /* Hidden when collapsed */
  transition: opacity 0.3s ease;
  white-space: nowrap;
}

.sidebar.expanded .menu-item span {
  opacity: 1; /* Fade in when expanded */
}

/* Sign Out */
.signout-container {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
  width: 100%;
}

.signout-container:hover {
  background: #f5f5f5;
}

.signout-container img {
  width: 24px;
  height: 24px;
  margin-right: 0;
  transition: margin-right 0.2s ease;
}

.sidebar.expanded .signout-container img {
  margin-right: 1rem;
}

.signout-container span {
  font-size: 0.95rem;
  font-weight: 500;
  color: #dc3545; /* Red text */
  opacity: 0; /* Hidden when collapsed */
  transition: opacity 0.3s ease;
  white-space: nowrap;
}

.sidebar.expanded .signout-container span {
  opacity: 1; /* Fade in when expanded */
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 1rem;
  transition: margin-left 0.3s ease;
}

/* Sign Out Overlay */
.signout-message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
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
  margin-bottom: 1rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 4px solid #ccc;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

/* Inactivity Warning Modal */
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
  z-index: 998;
}

.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-width: 400px;
}

.modal-content h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 1rem;
}

.modal-content p {
  font-size: 1rem;
  color: #718096;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn.primary {
  background: #4299e1;
  color: white;
}

.btn.primary:hover {
  background: #3182ce;
}

.btn.danger {
  background: #e53e3e;
  color: white;
}

.btn.danger:hover {
  background: #c53030;
}

/* Animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    flex-direction: row;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #e6e6e6;
    border-right: none;
  }

  .sidebar.expanded {
    width: 100%;
  }

  .brand-section {
    margin: 0 1rem 0 0;
  }

  .spacer {
    display: none; /* No spacer on mobile */
  }

  .menu {
    flex-direction: row;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
    padding-bottom: 0;
  }

  .menu-item {
    padding: 0.5rem;
    flex-direction: row;
  }

  .menu-item img {
    margin-right: 0.5rem;
    margin-bottom: 0;
  }

  .menu-item span {
    font-size: 0.75rem;
    opacity: 1; /* Always visible on mobile when expanded */
  }

  .sidebar:not(.expanded) .menu-item span {
    display: none; /* Hidden when collapsed on mobile */
  }

  .signout-container {
    padding: 0.5rem;
    flex-direction: row;
  }

  .signout-container img {
    margin-right: 0.5rem;
    margin-bottom: 0;
  }

  .signout-container span {
    font-size: 0.75rem;
    opacity: 1;
  }

  .sidebar:not(.expanded) .signout-container span {
    display: none;
  }

  .main-content {
    margin-left: 0 !important; /* Override inline style on mobile */
    padding: 1rem;
  }

  .logo {
    width: 40px; /* Smaller on mobile collapsed */
  }

  .sidebar.expanded .logo {
    width: 60px; /* Slightly smaller expanded size on mobile */
  }
}
</style>
