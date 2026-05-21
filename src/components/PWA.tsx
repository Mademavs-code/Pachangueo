"use client"

import { useEffect } from 'react'

export default function PWA() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('PWA Service Worker registrado con éxito: ', registration.scope);
          },
          function(err) {
            console.log('Falló el registro del PWA Service Worker: ', err);
          }
        );
      });
    }
  }, [])

  return null
}