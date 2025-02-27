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
      meta: { requiresAuth: true },
    },
    {
      path: '/dev',
      name: 'dev',
      component: () => import('../views/DevView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/fileManagement',
      name: 'fileManagement',
      component: () => import('../views/FileManagement.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/runFiles',
      name: 'runFiles',
      component: () => import('../views/RunPipelinesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/runHistory',
      name: 'runHistory',
      component: () => import('../views/RunHistory.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true },
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
  ],
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  userStore.loadUserFromStorage(); // Ensure user state is loaded

  const isAuthenticated = userStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    next('/home'); // Redirect authenticated users away from login
  } else {
    next();
  }
});

export default router;
