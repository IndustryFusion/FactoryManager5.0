'use client'

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function WelcomePage() {
  const router = useRouter();
  //const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
  useEffect(() => {
    // Always do navigations after the first render
    if (Cookies.get("login_flag") === "true") {
      router.push("/factory-site/factory-overview");
    } else {    
        router.push("/login");    
    }

  }, [])
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
    </main>
  );
}
