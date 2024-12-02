import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('userStore', () => {
  const userInfo = ref(null); // Holds user session details

  function setUser(user) {
    userInfo.value = user; // Update user info
  }

  function clearUser() {
    userInfo.value = null; // Clear user info
  }

  return { userInfo, setUser, clearUser };
});
