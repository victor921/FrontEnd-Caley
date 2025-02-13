import './assets/main.css'
import { createPinia } from 'pinia';
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@fortawesome/fontawesome-free/css/all.css';
import PrimeVue from "primevue/config";
import Aura from '@primevue/themes/aura';
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import { useUserStore } from '@/stores/userStore'

const app = createApp(App)
const pinia = createPinia();

app.use(router)
app.use(pinia)
app.use(PrimeVue, {
  theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.my-app-light',
        cssLayer: false
    }
  }
});

const userStore = useUserStore()
userStore.loadUserFromStorage()

app.mount('#app')
