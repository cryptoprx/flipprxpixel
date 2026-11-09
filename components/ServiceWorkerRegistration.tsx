'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      process.env.NODE_ENV !== 'production';

    if (isLocalhost) {
      // Never let a stale Service Worker cache intercept local dev chunks on localhost!
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.getRegistrations().then((regs) => {
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          if ('caches' in window) {
            caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
              .then(() => {
                if (hadController && !sessionStorage.getItem('flipprx_sw_cleared')) {
                  sessionStorage.setItem('flipprx_sw_cleared', '1');
                  window.location.reload();
                }
              });
          }
        });
      });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.update();
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch(() => {});
  }, []);

  return null;
}
