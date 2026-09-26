//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Where the XANA entry points in this app go.
 *
 * XANA PDT signs its own users in, so this is a plain link: no route token is
 * minted and nothing about the session is passed along. That is also why the
 * handlers no longer call `generate-token` — there is no product by this name
 * for the registry to mint a token for.
 *
 * Three places reach this:
 *   - the floating "Ask XANA" button (components/floating-xana-button.tsx)
 *   - the sidebar entry              (components/navBar/sidebar.tsx)
 *   - the dashboard banner           (pages/dashboard.tsx)
 */
export const XANA_PDT_URL =
  process.env.NEXT_PUBLIC_XANA_PDT_URL || 'https://xana-pdt.local';

export const openXanaPdt = () => {
  window.open(XANA_PDT_URL, '_blank', 'noopener,noreferrer');
};
