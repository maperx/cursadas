"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app can be installed on mobile
 * (Add to Home Screen / Install app). The service worker itself does no
 * caching — it only satisfies the browser's installability requirement.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing should never break the app.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
