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

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { NextComponentType, NextPageContext } from 'next';

const withAuth = (WrappedComponent: NextComponentType<NextPageContext>) => {
  const AuthComponent: NextComponentType<NextPageContext> = (props) => {
    const router = useRouter();

    useEffect(() => {
      if (router.pathname !== '/login') {
        const loginFlag = Cookies.get('login_flag');
        if (!loginFlag || loginFlag !== 'true') {
          router.push('/login');
        }
      }
    }, [router]);

    return <WrappedComponent {...props} />;
  };

  if (WrappedComponent.getInitialProps) {
    AuthComponent.getInitialProps = WrappedComponent.getInitialProps;
  }

  return AuthComponent;
};

export default withAuth;
