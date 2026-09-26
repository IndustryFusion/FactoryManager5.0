//
// Copyright (c) 2026 IB Systems GmbH
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
import { SetMetadata } from '@nestjs/common';

export const TOKEN_IN_QUERY_KEY = 'tokenInQuery';

/**
 * Lets one route take its session token from `?token=` when the request
 * carries no Authorization header.
 *
 * For server-sent events only. `EventSource` cannot set headers — it is the
 * one browser API that cannot — so a stream either reads the token from the
 * URL or cannot be authenticated at all. The token is still the masked
 * `ifricdi`, checked exactly as a header token is, and the route is still
 * refused without one; the decorator changes where the guard looks, not what
 * it accepts.
 *
 * A URL is a worse place for a credential than a header: it reaches access
 * logs, proxies and `Referer`. Use it only where there is no header to use,
 * and keep the list short — `grep -rn "@TokenInQuery()" src/` is that list.
 */
export const TokenInQuery = () => SetMetadata(TOKEN_IN_QUERY_KEY, true);
