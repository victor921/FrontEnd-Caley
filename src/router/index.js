import { createRouter, createWebHistory } from 'vue-router'

// Mock authentication function (replace with actual logic)
const isAuthenticated = () => {
  const userInfo = localStorage.getItem('userInfo') // Retrieve user info from storage
  return !!userInfo // Return true if user is logged in
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/dev',
      name: 'dev',
      component: () => import('../views/DevView.vue'),
      meta: { requiresAuth: true }, // This route requires authentication
    },
    {
      path: '/uploadFiles',
      name: 'uploadFiles',
      component: () => import('../views/UploadFileView.vue'),
      meta: { requiresAuth: true }, // This route requires authentication
    },
    {
      path: '/runFiles',
      name: 'runFiles',
      component: () => import('../views/RunPipelinesView.vue'),
      meta: { requiresAuth: true }, // This route requires authentication
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/', // Redirect any unmatched route to home
    },
  ],
})

// Add a navigation guard to check for authentication
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    // Redirect unauthenticated users to the login page
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next() // Allow navigation to the route
  }
})

export default router
