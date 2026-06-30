"use client";

import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

/**
 * Must be called from a user gesture (button tap).
 * iOS Safari requires permission requests to originate from user interaction.
 * Returns true if the user granted permission and subscription succeeded.
 */
export async function triggerPushSubscription(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY missing");
    return false;
  }

  try {
    const reg = await getOrRegisterSW();
    if (!reg) return false;

    if (Notification.permission === "denied") return false;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return false;
    }

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    localStorage.setItem("push_subscribed", "true");
    return true;
  } catch (err) {
    console.warn("[push] subscribe failed:", err);
    return false;
  }
}

/**
 * Registers the SW on mount and re-syncs the push subscription if permission
 * is already granted. Does NOT prompt for permission — call
 * triggerPushSubscription() from a button click for that.
 */
export function usePushNotifications(): void {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    (async () => {
      try {
        const reg = await getOrRegisterSW();
        if (!reg) return;

        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch (err) {
        console.warn("[push] sync failed:", err);
      }
    })();
  }, []);
}

export default usePushNotifications;
