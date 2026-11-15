// Hash-based routes, so every screen and state has a URL (back button works, screenshots
// and usability tasks can start anywhere) and the app needs no server-side routing.
//
//   #/                                      Screen 1  address selection   (?q=<text> prefills and checks the lookup box)
//   #/address/<address>                     Screen 2  daily timeline (the overview tab)
//   (every address route may carry ?method=<id>, the deciding method; it is left out for the default)
//   #/address/<address>/transactions        ...its transactions tab (?status=, direction=, from=, to=, sort=, page= are the filters)
//   #/address/<address>/what-if              ...its what-if tab (V4; ?direction=in|out opens it with that direction)
//   #/address/<address>/day/<YYYY-MM-DD>    Screen 3  day's transactions
//   #/address/<address>/day/<date>/tx/<txid>          ...with one transaction open
//   #/models   #/watchlist   #/about                  the other sections in the navigation

import { useSyncExternalStore } from 'react';
import type { MethodId } from '../api/types';
import { methodSearch, parseMethod } from './methods';

export type Route =
  | { screen: 'select'; query: string | null }
  | { screen: 'timeline'; address: string; method: MethodId }
  | { screen: 'transactions'; address: string; search: string; method: MethodId }
  | { screen: 'what-if'; address: string; search: string; method: MethodId }
  | { screen: 'day'; address: string; date: string; txid: string | null; method: MethodId }
  | { screen: 'models' }
  | { screen: 'watchlist' }
  | { screen: 'about' }
  | { screen: 'not-found'; path: string };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) {
    return { screen: 'select', query: new URLSearchParams(search).get('q') };
  }
  if (parts[0] === 'address' && parts.length === 2) {
    return { screen: 'timeline', address: parts[1], method: parseMethod(search) };
  }
  if (parts[0] === 'address' && parts.length === 3 && parts[2] === 'transactions') {
    return { screen: 'transactions', address: parts[1], search, method: parseMethod(search) };
  }
  if (parts[0] === 'address' && parts.length === 3 && parts[2] === 'what-if') {
    return { screen: 'what-if', address: parts[1], search, method: parseMethod(search) };
  }
  if (parts[0] === 'address' && parts[2] === 'day' && (parts.length === 4 || (parts.length === 6 && parts[4] === 'tx'))) {
    return { screen: 'day', address: parts[1], date: parts[3], txid: parts[5] ?? null, method: parseMethod(search) };
  }
  if (parts.length === 1 && (parts[0] === 'models' || parts[0] === 'watchlist' || parts[0] === 'about')) {
    return { screen: parts[0] };
  }
  return { screen: 'not-found', path };
}

/** A link's query string, with a leading `?` when there is one. */
const query = (...parts: string[]) => {
  const search = parts.filter(Boolean).join('&');
  return search ? `?${search}` : '';
};

// `method` is the deciding method the link keeps; the default is left out.
export const paths = {
  select: () => '#/',
  /** Screen 1 with its lookup box filled in and checked (the header search uses it). */
  lookup: (text: string) => `#/?q=${encodeURIComponent(text)}`,
  models: () => '#/models',
  watchlist: () => '#/watchlist',
  about: () => '#/about',
  timeline: (address: string, method?: MethodId) => `#/address/${encodeURIComponent(address)}${query(method ? methodSearch(method) : '')}`,
  /** `search` is the filters' query string, without the `?`; it carries the method itself. */
  transactions: (address: string, search = '') => `#/address/${encodeURIComponent(address)}/transactions${query(search)}`,
  /** `direction` opens the lab with that direction chosen. */
  whatIf: (address: string, direction?: 'in' | 'out', method?: MethodId) =>
    `#/address/${encodeURIComponent(address)}/what-if${query(direction ? `direction=${direction}` : '', method ? methodSearch(method) : '')}`,
  day: (address: string, date: string, method?: MethodId) => `#/address/${encodeURIComponent(address)}/day/${date}${query(method ? methodSearch(method) : '')}`,
  tx: (address: string, date: string, txid: string, method?: MethodId) =>
    `#/address/${encodeURIComponent(address)}/day/${date}/tx/${txid}${query(method ? methodSearch(method) : '')}`,
};

export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseRoute(hash);
}
