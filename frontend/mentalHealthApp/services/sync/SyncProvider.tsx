import React, { useEffect } from "react";
import { initDb } from "@/services/db";
import { syncAll } from "@/services/sync/syncController";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let mounted = true;
    initDb().then(() => {
      if (mounted) {
        syncAll("startup").catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return <>{children}</>;
}
