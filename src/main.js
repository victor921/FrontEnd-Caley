import './assets/main.css'
import { createPinia } from 'pinia';
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@fortawesome/fontawesome-free/css/all.css';
import PrimeVue from "primevue/config";
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice'; // Add this import
import Aura from '@primevue/themes/aura';
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
// Import Prism.js for SQL syntax highlighting
import 'prismjs/themes/prism.css';
import 'prismjs';
import 'prismjs/components/prism-sql';
import { useUserStore } from '@/stores/userStore'

const app = createApp(App)
const pinia = createPinia();

// Use plugins
app.use(router)
app.use(pinia)
// Register PrimeVue with Toast component and ToastService
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.my-app-light',
      cssLayer: false
    }
  }
}).use(ToastService) // Add this line to enable useToast
  .component('Toast', Toast); // Toast component registration

const userStore = useUserStore()
userStore.loadUserFromStorage()

app.mount('#app')
