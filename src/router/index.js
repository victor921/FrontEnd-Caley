import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Mock authentication function (replace with actual logic)
const isAuthenticated = () => {
  const userInfo = localStorage.getItem('userInfo'); // Retrieve user info from storage
  return !!userInfo; // Return true if user is logged in
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/dev',
      name: 'dev',
      component: () => import('../views/DevView.vue'),
      meta: { requiresAuth: true }, // This route requires authentication
    },
    {
      path: '/runFiles',
      name: 'runFiles',
      component: () => import('../views/UploadFileRunPipelineView.vue'),
      meta: { requiresAuth: true }, // This route requires authentication
    },
  ],
});

// Add a navigation guard to check for authentication
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    // Redirect unauthenticated users to the login page
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else {
    next(); // Allow navigation to the route
  }
});

export default router;
