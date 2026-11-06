import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically register the dedicated Service Worker proxy & audio engine
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-proxy.js', { scope: '/' })
      .then((registration) => {
        console.log('[Dedicated SW Engine] Registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('[Dedicated SW Engine] Registration note:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
