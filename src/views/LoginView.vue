<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import jwtDecode from "jwt-decode";

const router = useRouter();
const userStore = useUserStore();
const errorMessage = ref("");

function handleCredentialResponse(response) {
  try {
    const token = response.credential;
    const decoded = jwtDecode(token);
    const userData = {
      token,
      email: decoded.email,
      name: decoded.name || decoded.given_name,
      tokenExpiration: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    };
    userStore.signIn(userData);
    router.push("/home");
  } catch (err) {
    console.error("Error in handleCredentialResponse:", err);
    errorMessage.value = "Sign-in failed. Please try again.";
  }
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  try {
    await loadGoogleScript();
    window.google.accounts.id.initialize({
      client_id: "91719351588-ljjoae9ggl3i7n0jftrso8sbbn43uckf.apps.googleusercontent.com",
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 280,
    });
  } catch (err) {
    console.error("Error loading Google script:", err);
    errorMessage.value = "Unable to load sign-in functionality. Please refresh the page.";
  }
});
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <img src="@/assets/logo2.png" alt="Company Logo" class="company-logo" />
      <h1>Agent Login</h1>
      <p class="login-subtitle">Please sign in with Google</p>
      <div class="google-signin-wrapper">
        <div id="g_id_signin"></div>
      </div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.login-card {
  background: #fff;
  width: 400px;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.company-logo {
  width: 100px;
  height: auto;
  margin-bottom: 1rem;
}

.google-signin-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 1rem 0;
}

.error-message {
  margin-top: 1rem;
  color: #dc3545;
  font-weight: 500;
}

/* Modal Styles */
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

@media (max-width: 500px) {
  .login-card {
    width: 90%;
    padding: 1.5rem;
  }
}
</style>
