import "./assets/main.css";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

// Global error handler for Vue
app.config.errorHandler = (err: unknown, instance, info) => {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('Global Vue error handler:', error, info);
  
  // In production, send to error tracking service
  // logErrorToService(error, { context: info, instance });
};

app.use(router);

app.mount("#app");

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
  // In production, send to error tracking service
  // logErrorToService(event.reason, { type: 'unhandledRejection' });
});

// Handle global JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global JavaScript error:', event.error);
  // In production, send to error tracking service
  // logErrorToService(event.error, {
  //   type: 'globalError',
  //   filename: event.filename,
  //   lineno: event.lineno,
  //   colno: event.colno,
  // });
});