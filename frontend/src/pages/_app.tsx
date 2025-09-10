//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { AppProps } from "next/app";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primeicons/primeicons.css";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { appWithTranslation } from "next-i18next";
import withAuth from "@/app/withAuth";
import Head from "next/head";
import "@/app/globals.css";
import { UnauthorizedPopup } from '../utility/jwt';
import FloatingXanaButton from "@/components/floating-xana-button";


function MyApp({ Component, pageProps, router }: AppProps) {


  const AuthComponent =
    ["/auth/login", "/auth/register", "/recover-password", "/auth/reset/update-password", "/privacy", "/terms-and-conditions"].includes(router.pathname)
      ? Component
      : withAuth(Component);
  return (
    <Provider store={store}>
      <Head>
        <link href="/favicon.ico" rel="shortcut icon" type="image/x-icon" />
      </Head>
      <AuthComponent {...pageProps} />
      <FloatingXanaButton />
      <UnauthorizedPopup />
    </Provider>
  );
}

export default appWithTranslation(MyApp);
