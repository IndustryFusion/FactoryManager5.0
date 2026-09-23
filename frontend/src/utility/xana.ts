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
 * Whether the XANA entry points in this app do anything when clicked.
 *
 * Switched off deliberately. XANA AI is hidden in the IFX Suite app grid, so
 * sending someone there from here would open an application the suite no
 * longer offers. The buttons and links stay visible on purpose — the entry
 * points are meant to remain where users already know to find them — but a
 * click does nothing until XANA PDT AI ships and they are pointed at it.
 *
 * Re-enabling is this one flag. The routing behind it is left intact rather
 * than deleted, in all three places it is reached from:
 *   - the floating "Ask XANA" button (components/floating-xana-button.tsx)
 *   - the sidebar entry            (components/navBar/sidebar.tsx)
 *   - the dashboard banner         (pages/dashboard.tsx)
 *
 * When that happens, the product name each handler asks a token for needs
 * revisiting too: the floating button requests "XANA AI" explicitly, while
 * the other two leave it to the backend's default.
 */
export const XANA_ROUTING_ENABLED = false;
