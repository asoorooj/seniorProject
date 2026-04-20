import { registerUser, saveUser } from '@/services/apiService';
import RegisterScreen from '../components/onboarding-screens/register';
import { useRouter } from "expo-router";
import React, { useState } from "react";
export default function Register() {
  const router = useRouter();

  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  // const handleRegister = async (email, password) => {
  //   try{
  //     const res = await registerUser(email, password);

  //     console.log("REGISTER RESPONSE:", res);
  //     console.log("EMAIL:", res.user.email);
  //     console.log("PASSWORD:", password);
  //     if (res.access_token) {
  //       await saveUser({user:res.user, access_token:res.access_token});
  //       console.log("Registered + Logged in!");

  //       router.replace("/(tabs)"); // go to app
  //     } else {
  //       console.warn(res);
  //     }
  //   } catch(error){
  //     console.error(error);
  //   }
  // };

  return <RegisterScreen />;
}