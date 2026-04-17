import RegisterScreen from '../components/onboarding-screens/register';
import { registerUser, saveToken } from "../constants/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    const res = await registerUser(email, password);

    console.log("REGISTER RESPONSE:", res);
    console.log("EMAIL:", email);
    console.log("PASSWORD:", password);
    if (res.token) {
      await saveToken(res.token);
      console.log("Registered + Logged in!");

      router.replace("/(tabs)"); // go to app
    } else {
      console.log(res.error);
    }
  };

  return <RegisterScreen 
    email={email} password={password} setEmail={setEmail} setPassword={setPassword} onRegister={handleRegister}/>;
}