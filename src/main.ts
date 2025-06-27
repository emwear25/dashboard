import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { apiPlugin } from './plugins/api'
// Import v-calendar
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'

// Create app
const app = createApp(App)
const pinia = createPinia()

// Use plugins
app.use(pinia)
app.use(router)
app.use(apiPlugin)
// Use v-calendar
app.use(VCalendar, {})

// Mount app
app.mount('#app')