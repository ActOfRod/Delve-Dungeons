"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {
        // Non-fatal — manifest still works in some browsers without SW.
      });
  }, []);

  return null;
}
