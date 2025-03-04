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

function toggleSidebar() {
  isSidebarExpanded.value = !isSidebarExpanded.value; // Toggle on click/tap
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
    <!-- Hamburger Menu Button -->
    <div v-if="isAuthenticated" class="hamburger" @click="toggleSidebar">
      <div class="hamburger-line"></div>
      <div class="hamburger-line"></div>
      <div class="hamburger-line"></div>
    </div>

    <!-- SIDEBAR for authenticated users -->
    <aside
      v-if="isAuthenticated"
      :class="['sidebar', { expanded: isSidebarExpanded }]"
    >
      <!-- Brand Section -->
      <div class="brand-section">
        <img alt="Company Logo" class="logo" src="@/assets/logo2.png" />
      </div>

      <!-- Menu Items -->
      <nav class="menu">
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/home'); toggleSidebar()">
          <img src="@/assets/icons/home.svg" alt="Home" />
          <span>Home</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/runFiles'); toggleSidebar()">
          <img src="@/assets/icons/run.svg" alt="Run Files" />
          <span>Run Files</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/fileManagement'); toggleSidebar()">
          <img src="@/assets/icons/upload.svg" alt="File Management" />
          <span>File Management</span>
        </div>
        <div class="menu-item" @click="navigateTo('/searchContact'); toggleSidebar()">
          <img src="@/assets/icons/search.svg" alt="Search Contact" />
          <span>Search Contact</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/runHistory'); toggleSidebar()">
          <img src="@/assets/icons/history.svg" alt="Run History" />
          <span>Run History</span>
        </div>
        <div v-if="isAdmin" class="menu-item" @click="navigateTo('/settings'); toggleSidebar()">
          <img src="@/assets/icons/settings.svg" alt="Settings" />
          <span>Settings</span>
        </div>
        <div class="menu-item signout-container" @click="signOut">
          <img src="@/assets/icons/logout.svg" alt="Sign Out" />
          <span>Sign Out</span>
        </div>
      </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main
      :class="['main-content', { 'full-width': !isAuthenticated || isSidebarExpanded }]"
      :style="{ marginLeft: isAuthenticated && !isSidebarExpanded ? '70px' : '0' }"
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
  position: relative;
}

/* Hamburger Menu */
.hamburger {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 25px;
  cursor: pointer;
  z-index: 1001;
  display: none; /* Hidden on desktop */
}

.hamburger-line {
  width: 100%;
  height: 3px;
  background: #333;
  margin: 5px 0;
  transition: all 0.3s ease;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 70px; /* Collapsed width on desktop */
  background: #ffffff;
  color: #333;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  transition: transform 0.3s ease;
  z-index: 1000;
}

.sidebar.expanded {
  transform: translateX(0); /* Visible on mobile */
  width: 250px; /* Wider on desktop when expanded */
}

/* Brand Section */
.brand-section {
  text-align: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.logo {
  width: 40px;
  height: auto;
  transition: width 0.3s ease;
}

.sidebar.expanded .logo {
  width: 60px;
}

/* Menu */
.menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
  width: 100%;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item img {
  width: 20px;
  height: 20px;
  margin-right: 0;
  transition: margin-right 0.2s ease;
}

.sidebar.expanded .menu-item img {
  margin-right: 0.75rem;
}

.menu-item span {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2d3748;
  opacity: 0;
  transition: opacity 0.3s ease;
  white-space: nowrap;
}

.sidebar.expanded .menu-item span {
  opacity: 1;
}

/* Sign Out (within menu) */
.signout-container {
  color: #dc3545;
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 1rem;
  transition: margin-left 0.3s ease;
}

.main-content.full-width {
  margin-left: 0;
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
  padding: 1.5rem;
  text-align: center;
}

.signout-card h2 {
  color: #fff;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #ccc;
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
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-width: 90%;
  width: 300px;
}

.modal-content h2 {
  font-size: 1.25rem;
  color: #2d3748;
  margin-bottom: 0.75rem;
}

.modal-content p {
  font-size: 0.9rem;
  color: #718096;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
  min-width: 100px;
  margin: 0.25rem;
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
  .hamburger {
    display: block; /* Show hamburger on mobile */
  }

  .sidebar {
    width: 250px; /* Full menu width */
    height: 100%;
    transform: translateX(-100%); /* Hidden off-screen */
    padding: 1rem 0;
    border-right: none;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  }

  .sidebar.expanded {
    transform: translateX(0); /* Slide in */
  }

  .brand-section {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .menu {
    gap: 1rem;
    align-items: flex-start;
    padding: 0 1rem;
  }

  .menu-item {
    padding: 0.75rem 1rem;
    justify-content: flex-start;
  }

  .menu-item img {
    width: 20px;
    height: 20px;
    margin-right: 1rem;
  }

  .menu-item span {
    font-size: 1rem;
    opacity: 1; /* Always visible when expanded */
  }

  .signout-container {
    padding: 0.75rem 1rem;
  }

  .signout-container img {
    margin-right: 1rem;
  }

  .signout-container span {
    opacity: 1;
  }

  .main-content {
    margin-left: 0 !important;
    padding: 0.75rem;
  }

  .main-content.full-width {
    margin-left: 0;
  }

  .logo {
    width: 50px;
  }

  /* Overlays */
  .signout-card,
  .modal-content {
    padding: 1rem;
    max-width: 85%;
    width: 280px;
  }

  .signout-card h2,
  .modal-content h2 {
    font-size: 1.1rem;
  }

  .modal-content p {
    font-size: 0.85rem;
  }

  .btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    min-width: 80px;
  }
}

@media (max-width: 480px) {
  .hamburger {
    width: 25px;
    height: 20px;
    top: 8px;
    right: 8px;
  }

  .hamburger-line {
    height: 2px;
    margin: 4px 0;
  }

  .sidebar {
    width: 200px;
  }

  .menu-item span,
  .signout-container span {
    font-size: 0.9rem;
  }

  .menu-item img,
  .signout-container img {
    width: 18px;
    height: 18px;
  }

  .main-content {
    padding: 0.5rem;
  }

  .logo {
    width: 40px;
  }
}
</style>
