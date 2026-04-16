import React, { createContext, useContext, useState } from "react";

export type User = {
  id: number;
  email: string;
  external_id: string;
  created_at: string;
  consent_timestamp?: string;
  pref_eval_face: boolean;
  pref_eval_audio: boolean;
  pref_eval_text: boolean;
};

type AuthContextType = {
  user: User | null;
  sessionId: number | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setSessionId: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        loading,
        setUser,
        setSessionId,
        setLoading,
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