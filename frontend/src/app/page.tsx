// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

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
