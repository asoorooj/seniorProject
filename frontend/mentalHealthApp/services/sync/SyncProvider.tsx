import React, { useEffect } from "react";
import { initDb } from "@/services/db";
import { syncAllUnsynced } from "@/services/sync/syncController";
import { useAuth } from "@/hooks/useAuth";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { sessionId, loading } = useAuth();

  useEffect(() => {
    let mounted = true;
    initDb().then(() => {
      if (mounted && !loading && sessionId) {
        syncAllUnsynced(sessionId, "startup").catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [sessionId, loading]);

  return <>{children}</>;
}
