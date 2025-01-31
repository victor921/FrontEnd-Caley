import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

// Mock authentication function (replace with real logic)
function isAuthenticated() {
  try {
    const raw = localStorage.getItem('userInfo')
    if (!raw) return false
    const userData = JSON.parse(raw)
    // Example check: if token isn't expired or if userData has minimal fields
    // For now, just check existence
    return !!userData
  } catch (err) {
    return false
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Redirect the root "/" to "/login"
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      // This route does *not* require auth; user is logging in
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
      path: '/uploadFiles',
      name: 'uploadFiles',
      component: () => import('../views/UploadFileView.vue'),
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
      path: '/:pathMatch(.*)*',
      redirect: '/login', // Any unmatched route -> /login
    },
  ],
})


// Global guard => if meta.requiresAuth & not logged => go /login
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isAuthenticated = userStore.isAuthenticated

  if (to.path !== '/login' && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
