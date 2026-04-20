import React, { useEffect } from "react";
import { initDb } from "@/services/db";
import { syncAllUnsynced } from "@/services/sync/syncController";
import { useAuth } from "@/hooks/useAuth";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { jwt, loading } = useAuth();

  useEffect(() => {
    let mounted = true;
    initDb().then(() => {
      if (mounted && !loading && jwt) {
        syncAllUnsynced(jwt, "startup").catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [jwt, loading]);

  return <>{children}</>;
}
