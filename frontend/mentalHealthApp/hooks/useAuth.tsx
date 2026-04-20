import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearDatabase } from "@/services/db";
import { setSyncUnauthorizedHandler } from "@/services/sync/syncController";
import { fetchUserProfile, getUser, syncUser } from "@/services/apiService";

export type User = {
  id: number;
  email: string;
  external_id: string;
  created_at: string;
  consent_timestamp?: string;
  preferences: {
    pref_eval_image: boolean;
    pref_eval_audio: boolean;
    pref_eval_text: boolean;
  };
  storage_consent: {
    stor_cons_image: boolean;
    stor_cons_audio: boolean;
    stor_cons_text: boolean;
  }
  streak:number;
  token: string | undefined; 
  journalCount?:number;
};

type AuthContextType = {
  user: User | null;
  jwt: string | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setJwt: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  syncUserToCache: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const syncUserToCache = useCallback(async function(){
    try{
      if(user){
        await syncUser(user);
      } else {
        throw new Error("user is undefined");
      } 
    } catch (error){
      console.error("[cache] could not sync user cache",error);
    }
  },[user]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const restored = await getUser();
        try{
          const updatedUserData = await fetchUserProfile();
          await syncUser(updatedUserData.user);
          const userToUpdate = {...updatedUserData.user,journalCount: updatedUserData.journal_count}
          setUser(userToUpdate);
        } catch (error){
          console.error(error, "Can not update user profile");
          if (restored && restored.token) {
            setUser(restored);
            setJwt(restored.token);
          }
        }
        if (!mounted) return;
      } catch (err) {
        console.warn("[auth] restore failed", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    setSyncUnauthorizedHandler(async () => {
      await clearDatabase();
      if (!mounted) return;
      setUser(null);
      setJwt(null);
      setLoading(false);
    });

    bootstrap();
    return () => {
      mounted = false;
      setSyncUnauthorizedHandler(null);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        jwt,
        loading,
        setUser,
        setJwt,
        setLoading,
        syncUserToCache,
      }}
    >
      {children}
    </AuthContext.Provider>
    
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
