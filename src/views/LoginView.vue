<template>
  <div class="login-container">
    <div class="login-card">
      <img src="@/assets/logo2.png" alt="Company Logo" class="company-logo" />
      <h1>Welcome to CAS Portal</h1>
      <p class="login-subtitle">Please sign in with Google</p>

      <!-- Google Sign-In Button Wrapper -->
      <div class="google-signin-wrapper">
        <div id="g_id_signin"></div>
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import jwtDecode from "jwt-decode";

const router = useRouter();
const userStore = useUserStore();
const errorMessage = ref("");

// Callback function for Google Sign-In
function handleCredentialResponse(response) {
  try {
    const token = response.credential;
    const decoded = jwtDecode(token);

    const userData = {
      token,
      email: decoded.email,
      name: decoded.name || decoded.given_name,
      tokenExpiration: decoded.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : null,
    };

    userStore.signIn(userData);
    router.push("/home").then(() => {
      window.location.reload(); // Ensure reactive changes are applied
    });
  } catch (err) {
    console.error("Error in handleCredentialResponse:", err);
    errorMessage.value = "Sign-in failed. Please try again.";
  }
}

onMounted(() => {
  if (
    !window.google ||
    !window.google.accounts ||
    !window.google.accounts.id
  ) {
    errorMessage.value = "Google script not loaded. Check index.html.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id:
      "91719351588-ljjoae9ggl3i7n0jftrso8sbbn43uckf.apps.googleusercontent.com", // Replace with your actual client ID
    callback: handleCredentialResponse,
  });

  window.google.accounts.id.renderButton(
    document.getElementById("g_id_signin"),
    {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 280,
    }
  );

  // Optionally, display the One Tap prompt
  // window.google.accounts.id.prompt();
});
</script>

<style scoped>
/* Container */
.login-container {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

/* Login Card */
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

/* Company Logo */
.company-logo {
  width: 100px;
  height: auto;
  margin-bottom: 1rem;
}

/* Google Sign-In Button Wrapper */
.google-signin-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 1rem 0;
}

/* Error Message */
.error-message {
  margin-top: 1rem;
  color: #dc3545;
  font-weight: 500;
}

/* Additional Styling for Responsiveness (Optional) */
@media (max-width: 500px) {
  .login-card {
    width: 90%;
    padding: 1.5rem;
  }
}
</style>
