// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

const routes = [
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
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/dev',
    name: 'dev',
    component: () => import('../views/DevView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/fileManagement',
    name: 'fileManagement',
    component: () => import('../views/FileManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/runFiles',
    name: 'runFiles',
    component: () => import('../views/RunPipelinesView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/runHistory',
    name: 'runHistory',
    component: () => import('../views/RunHistory.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/searchContact',
    name: 'searchContact',
    component: () => import('../views/SearchContact.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  // Load the user state only if it hasn't been loaded yet.
  if (!userStore.user) {
    await userStore.loadUserFromStorage();
  }

  const isAuthenticated = userStore.isAuthenticated;
  const isAdmin = userStore.isAdmin;

  // Redirect to /login if the route requires authentication and the user isn't authenticated.
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/login');
  }

  // If an authenticated user tries to access /login, redirect them appropriately.
  if (to.path === '/login' && isAuthenticated) {
    return next(isAdmin ? '/home' : '/searchContact');
  }

  // If the route requires admin privileges and the user is not an admin, redirect to /searchContact.
  if (to.meta.requiresAdmin && !isAdmin) {
    return next('/searchContact');
  }

  next();
});

export default router;
