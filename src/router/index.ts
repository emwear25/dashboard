import { createRouter, createWebHistory } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue')
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue')
        },
        {
          path: 'doctors',
          name: 'doctors',
          component: () => import('@/views/DoctorsView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'doctors/new',
          name: 'new-doctor',
          component: () => import('@/views/DoctorFormView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'doctors/:id/edit',
          name: 'edit-doctor',
          component: () => import('@/views/DoctorFormView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admins/new',
          name: 'new-admin',
          component: () => import('@/views/AdminFormView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admins/:id/edit',
          name: 'edit-admin',
          component: () => import('@/views/AdminFormView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'availability',
          name: 'availability',
          component: () => import('@/views/AvailabilityView.vue'),
          meta: { requiresDoctor: true }
        },
        {
          path: 'coupons',
          name: 'coupons',
          component: () => import('@/views/CouponsView.vue')
        },
        {
          path: 'subscribers',
          name: 'subscribers',
          component: () => import('@/views/SubscribersView.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'appointments',
          name: 'appointments',
          component: () => import('@/views/AppointmentsView.vue'),
          meta: { requiresDoctor: true }
        },
        {
          path: 'patients',
          name: 'patients',
          component: () => import('@/views/PatientsView.vue'),
          meta: { requiresDoctor: true }
        },
        {
          path: 'patients/:id',
          name: 'patient-detail',
          component: () => import('@/views/PatientDetailView.vue'),
          meta: { requiresDoctor: true }
        },
        {
          path: 'meeting/:id',
          name: 'meeting',
          component: () => import('@/views/MeetingView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue')
        },
      ],
    },
  ],
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  // Lazy import to avoid circular dependency
  const { useDoctorAuth } = await import('@/composables/useDoctorAuth')
  const { isAuthenticated, isDoctor, isAdmin, initialize } = useDoctorAuth()
  
  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Initialize auth if not authenticated
    if (!isAuthenticated.value) {
      const initialized = await initialize()
      if (!initialized) {
        next('/login')
        return
      }
    }
    
    // Check if route requires admin access
    if (to.matched.some(record => record.meta.requiresAdmin)) {
      if (!isAdmin.value) {
        next('/dashboard')
        return
      }
    }
    
    // Check if route requires doctor role
    if (to.matched.some(record => record.meta.requiresDoctor)) {
      if (!isDoctor.value) {
        next('/dashboard')
        return
      }
    }
    
    next()
  } else {
    // Route doesn't require auth, proceed
    if (to.path === '/login' && isAuthenticated.value) {
      // Redirect to dashboard if already authenticated
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router 