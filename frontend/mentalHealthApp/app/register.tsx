import RegisterScreen from '../components/onboarding-screens/register';
import { registerUser, saveToken } from "../constants/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { persistAuthSession, setCurrentUserId } from "@/services/db";
import { useAuth } from "@/hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Register() {
  const router = useRouter();
  const { setUser: setAuthUser, setSessionId } = useAuth(); // ✅ add this

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    const res = await registerUser(email, password);

    console.log("REGISTER RESPONSE:", res);

    if (res.access_token && res.user_id) {
      await saveToken(res.access_token);
      const userId = res.user_id.toString();
      await AsyncStorage.setItem("user_id", userId);
      setCurrentUserId(res.user_id);

      try {
        await persistAuthSession(res.user, res.user_id);
        console.log("persistAuthSession done ✅");

        setAuthUser(res.user);       // ✅
        setSessionId(res.user_id);   // ✅
      } catch (e) {
        console.log("persistAuthSession FAILED ❌", e);
        return;
      }

      router.replace("/(tabs)");
    } else {
      console.log(res.error);
    }
  };

  return <RegisterScreen 
    email={email} password={password} setEmail={setEmail} setPassword={setPassword} onRegister={handleRegister}/>;
}