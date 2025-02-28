// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/dev',
      name: 'dev',
      component: () => import('../views/DevView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/fileManagement',
      name: 'fileManagement',
      component: () => import('../views/FileManagement.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/runFiles',
      name: 'runFiles',
      component: () => import('../views/RunPipelinesView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/runHistory',
      name: 'runHistory',
      component: () => import('../views/RunHistory.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }, // Admin-only
    },
    {
      path: '/searchContact',
      name: 'searchContact',
      component: () => import('../views/SearchContact.vue'),
      meta: { requiresAuth: true }, // Accessible to all authenticated users
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  userStore.loadUserFromStorage(); // Ensure user state is loaded

  const isAuthenticated = userStore.isAuthenticated;
  const isAdmin = userStore.isAdmin;

  // Allow unauthenticated users to access /login only
  if (!isAuthenticated) {
    if (to.path === '/login') {
      next();
    } else {
      next('/login');
    }
    return;
  }

  // Redirect authenticated users away from /login to /searchContact (non-admin) or /home (admin)
  if (to.path === '/login') {
    next(isAdmin ? '/home' : '/searchContact');
    return;
  }

  // Allow all authenticated users to access /searchContact
  if (to.path === '/searchContact') {
    next();
    return;
  }

  // Restrict non-admin users to /searchContact only
  if (!isAdmin) {
    next('/searchContact');
    return;
  }

  // For admins, enforce requiresAuth and allow access
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
