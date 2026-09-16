"use client"

import { useEffect } from "react"

/**
 * Registers the PWA service worker (public/sw.js) that caches the app shell
 * so pages already visited - including the fully offline "Offline Dr"
 * triage engine - keep working with no network connection.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").then(() => {
      // The page that triggers registration is never itself controlled by
      // the service worker - only pages loaded *after* it activates are.
      // Without a reload here, this first visit's JS/CSS chunks never get
      // cached, so the very next offline load would render the HTML shell
      // but ship with no working JavaScript at all. Reload once, silently,
      // the first time a new worker takes control so this visit gets fully
      // cached too.
      if (navigator.serviceWorker.controller) return
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (sessionStorage.getItem("sw-reloaded")) return
        sessionStorage.setItem("sw-reloaded", "1")
        window.location.reload()
      })
    }).catch((error) => {
      console.warn("[PWA] Service worker registration failed:", error)
    })
  }, [])

  return null
}
