import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { AddressSummary, ApiError } from '../api/types';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { PageHeading, useDocumentTitle } from '../components/PageHeading';
import { Loading, StatePanel } from '../components/StatePanel';
import { WatchStar } from '../components/WatchStar';
import { KIND_LABEL, validateAddress } from '../lib/address';
import { dayKey, formatDay, formatDayRange } from '../lib/dates';
import { formatCount, plural, shortAddress } from '../lib/format';
import { navigate, paths } from '../lib/router';
import { isTransient, runRequest, useRequest } from '../hooks/useRequest';
import { usePreferences } from '../hooks/usePreferences';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { useSlow } from '../hooks/useSlow';

// The live lookup's dialog (V8) is fetched only when the user asks for it.
const LiveLookupDialog = lazy(() => import('./LiveLookupDialog'));

// Screen 1 — choose an address: a lookup box plus the list of addresses in the snapshot.
// The lookup validates in the browser first (invalid never reaches the API), then asks the
// API whether the address is in the snapshot (supported / unsupported).

type Lookup =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'invalid'; message: string; hint: string }
  | { status: 'unsupported'; address: string; message: string; examples: string[]; canLookupLive: boolean }
  | { status: 'failed'; error: ApiError };

export function SelectScreen({ query }: { query: string | null }) {
  useDocumentTitle('');
  const list = useRequest('addresses', (signal) => api.listAddresses({ signal }));
  const [value, setValue] = useState(query ?? '');
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // An address opens with the method the user chose last (V2's method menu remembers it).
  const [{ method, recent }] = usePreferences();

  async function check(text: string) {
    const local = validateAddress(text);
    if (!local.ok) {
      setLookup({ status: 'invalid', message: local.message, hint: local.hint });
      inputRef.current?.focus();
      return;
    }
    setLookup({ status: 'checking' });
    const res = await runRequest(() => api.lookup(local.address));
    if (res.ok) {
      navigate(paths.timeline(res.data.address, method ?? undefined));
      return;
    }
    const body = res.error.body;
    if (body.status === 'invalid') setLookup({ status: 'invalid', message: body.message, hint: body.hint ?? '' });
    else if (body.status === 'unsupported') setLookup({ status: 'unsupported', address: local.address, message: body.message, examples: body.examples, canLookupLive: body.canLookupLive });
    else {
      // Like a page's own request, a failure that says nothing about the address asks the status dot to look again at once.
      if (isTransient(res.error)) recheck();
      setLookup({ status: 'failed', error: res.error });
    }
  }

  // A lookup that failed because the service was down is repeated when the service is back, as a page's own request is (R4).
  const { recoveries, recheck } = useServiceStatus();
  const seenRecoveries = useRef(recoveries);
  useEffect(() => {
    if (seenRecoveries.current === recoveries) return;
    seenRecoveries.current = recoveries;
    if (lookup.status === 'failed' && isTransient(lookup.error)) void check(value);
  }, [recoveries]);

  useEffect(() => {
    // Run once for a ?q= link (used by screenshots and the walkthrough); later submits go through the form.
    if (query) void check(query);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void check(value);
  }

  function reset() {
    setValue('');
    setLookup({ status: 'idle' });
    inputRef.current?.focus();
  }

  const invalid = lookup.status === 'invalid';
  const slowLookup = useSlow(lookup.status === 'checking');
  const snapshot = list.status === 'success' ? list.data.snapshot : null;

  return (
    <div className="page page-select">
      <div className="home-hero">
        <HeroArt />
        <section className="intro">
          <p className="hero-eyebrow">Bitcoin address activity, explained</p>
          <PageHeading>Explore a Bitcoin address's activity</PageHeading>
          <p className="lede">
            Pick an address to see its transactions day by day. Open any day to check which transactions are unusual
            compared with that address's own history, and why.
          </p>
        </section>

      <section className="card lookup-card" aria-labelledby="lookup-title">
        <h2 id="lookup-title">Look up an address</h2>
        <form onSubmit={onSubmit} noValidate className="lookup-form">
          <label htmlFor="address-input" className="field-label">
            Bitcoin address
          </label>
          <p id="address-help" className="field-help">
            Addresses start with 1, 3 or bc1. Only addresses in the snapshot have results.
          </p>
          <div className="input-row">
            <input
              id="address-input"
              ref={inputRef}
              className="text-input mono"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (lookup.status !== 'checking') setLookup({ status: 'idle' });
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. bc1q…"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? 'address-help address-error' : 'address-help'}
            />
            <button type="submit" className="btn btn-primary" disabled={lookup.status === 'checking'}>
              {lookup.status === 'checking' ? (
                <>
                  <span className="spinner spinner-inline" aria-hidden="true" /> Checking…
                </>
              ) : (
                <>
                  <Icon name="search" /> Look up
                </>
              )}
            </button>
          </div>
          {invalid ? (
            <p id="address-error" className="field-error" role="alert">
              <Icon name="error" />
              <span>
                <strong>{lookup.message}</strong> {lookup.hint}
              </span>
            </p>
          ) : null}
          {lookup.status === 'checking' ? (
            <p className={slowLookup ? 'field-help' : 'sr-only'} role="status">
              {slowLookup ? 'Still checking, this is taking a little longer.' : 'Checking whether this address is in the snapshot…'}
            </p>
          ) : null}
        </form>

        {lookup.status === 'unsupported' ? (
          <StatePanel
            tone="info"
            title="This address isn't in the snapshot"
            headingLevel={3}
            live="alert"
            testId="state-unsupported"
            actions={
              <>
                {lookup.canLookupLive ? (
                  <button type="button" className="btn btn-primary" aria-haspopup="dialog" onClick={() => setFetching(true)}>
                    Fetch this address's public history
                  </button>
                ) : null}
                <button type="button" className="btn btn-secondary" onClick={reset}>
                  Clear and try another address
                </button>
              </>
            }
          >
            <p>{lookup.message}</p>
            {lookup.canLookupLive ? (
              <p>
                Or fetch its most recent confirmed transactions from the public blockchain service. Only the address is sent to it, and the result is marked as live data.
              </p>
            ) : null}
            <p>The explorer only covers a fixed set of addresses chosen before any analysis. Try one of these instead:</p>
            <ul className="example-list">
              {lookup.examples.map((a) => (
                <li key={a}>
                  <a className="mono" href={paths.timeline(a, method ?? undefined)}>
                    {shortAddress(a, 12, 8)}
                  </a>
                </li>
              ))}
            </ul>
          </StatePanel>
        ) : null}
        {fetching && lookup.status === 'unsupported' ? (
          <Suspense fallback={null}>
            <LiveLookupDialog address={lookup.address} method={method ?? undefined} onClose={() => setFetching(false)} />
          </Suspense>
        ) : null}
        {lookup.status === 'failed' ? <ErrorState error={lookup.error} onRetry={() => void check(value)} headingLevel={3} /> : null}
      </section>
      </div>

      {list.status === 'success' && list.data.addresses.length > 0 ? <SnapshotSummary addresses={list.data.addresses} snapshotDate={list.data.snapshot.snapshotDate} source={list.data.snapshot.source} /> : null}

      <ol className="how-steps" aria-label="How to use the explorer">
        <li>
          <span className="how-num" aria-hidden="true">1</span>
          <span><strong>Pick an address</strong> from the list or look one up.</span>
        </li>
        <li>
          <span className="how-num" aria-hidden="true">2</span>
          <span><strong>Read its timeline</strong>: days with an unusual transaction are marked.</span>
        </li>
        <li>
          <span className="how-num" aria-hidden="true">3</span>
          <span><strong>Open a day</strong> to see which transaction stands out, and why.</span>
        </li>
      </ol>

      {recent.length > 0 ? (
        <section className="recent-section" aria-labelledby="recent-title">
          <h2 id="recent-title">Recently opened</h2>
          <ul className="example-list">
            {recent.map((a) => (
              <li key={a}>
                <a className="mono" href={paths.timeline(a, method ?? undefined)} aria-label={`Open activity for ${a}`}>
                  {shortAddress(a, 12, 8)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="snapshot-section" aria-labelledby="snapshot-title">
        <div className="section-head">
          <h2 id="snapshot-title">Addresses in the snapshot</h2>
          {snapshot ? (
            <p className="section-meta">
              {plural(snapshot.addressCount, 'address', 'addresses')} · snapshot of {formatDay(snapshot.snapshotDate)} ·{' '}
              {snapshot.source}
            </p>
          ) : null}
        </div>
        {list.status === 'loading' ? <Loading label="Loading the address list…" block /> : null}
        {list.status === 'error' ? <ErrorState error={list.error} onRetry={list.retry} /> : null}
        {list.status === 'success' && list.data.addresses.length === 0 ? (
          <StatePanel tone="empty" title="The snapshot has no addresses yet">
            <p>Build the snapshot first (see the README), then reload this page.</p>
          </StatePanel>
        ) : null}
        {list.status === 'success' && list.data.addresses.length > 0 ? <AddressTable addresses={list.data.addresses} /> : null}
      </section>
    </div>
  );
}

/** The brand's bar motif, drawn large and quiet behind the hero. Decorative only. */
function HeroArt() {
  const bars = [22, 38, 30, 52, 44, 66, 48, 80, 58, 72];
  return (
    <svg className="hero-art" viewBox="0 0 220 100" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      {bars.map((h, i) => (
        <rect key={i} x={i * 22} y={100 - h} width="14" height={h} rx="2" className={i === 7 ? 'hero-art-flag' : 'hero-art-bar'} />
      ))}
    </svg>
  );
}

/** The whole snapshot at a glance, summed from E3's list. */
function SnapshotSummary({ addresses, snapshotDate, source }: { addresses: AddressSummary[]; snapshotDate: string; source: string }) {
  const tx = addresses.reduce((n, a) => n + a.txCount, 0);
  const scored = addresses.reduce((n, a) => n + a.scoredCount, 0);
  const flagged = addresses.reduce((n, a) => n + a.flaggedCount, 0);
  const share = scored ? ((flagged / scored) * 100).toFixed(1) : '0';
  return (
    <section className="card home-summary" aria-label="The snapshot at a glance">
      <dl className="stat-row metrics">
        <div className="stat">
          <dt>Addresses</dt>
          <dd>
            {formatCount(addresses.length)}
            <span className="stat-sub">chosen before any analysis</span>
          </dd>
        </div>
        <div className="stat">
          <dt>Transactions</dt>
          <dd>
            {formatCount(tx)}
            <span className="stat-sub">{formatCount(scored)} with enough history to score</span>
          </dd>
        </div>
        <div className="stat">
          <dt>Unusual</dt>
          <dd>
            {formatCount(flagged)}
            <span className="stat-sub">{share}% of scored transactions</span>
          </dd>
        </div>
        <div className="stat">
          <dt>Snapshot</dt>
          <dd>
            {formatDay(snapshotDate)}
            <span className="stat-sub">{source} · days in UTC</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

type SortKey = 'tx' | 'unusual' | 'share' | 'recent';
const SORT_LABEL: Record<SortKey, string> = {
  tx: 'Most transactions',
  unusual: 'Most unusual',
  share: 'Highest unusual share',
  recent: 'Most recently active',
};

function AddressTable({ addresses }: { addresses: AddressSummary[] }) {
  const [{ method }] = usePreferences();
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('tx');
  const shareOf = (a: AddressSummary) => (a.scoredCount ? a.flaggedCount / a.scoredCount : -1);
  const maxShare = Math.max(0.0001, ...addresses.map(shareOf));
  const needle = filter.trim().toLowerCase();
  const shown = addresses
    .filter((a) => !needle || a.address.toLowerCase().includes(needle) || KIND_LABEL[a.kind].toLowerCase().includes(needle))
    .sort((x, y) => {
      if (sort === 'unusual') return y.flaggedCount - x.flaggedCount || y.txCount - x.txCount;
      if (sort === 'share') return shareOf(y) - shareOf(x) || y.txCount - x.txCount;
      if (sort === 'recent') return y.lastSeen.localeCompare(x.lastSeen) || y.txCount - x.txCount;
      return y.txCount - x.txCount;
    });

  return (
    <div className="card table-card">
      <div className="table-toolbar">
        <div className="toolbar-field">
          <label htmlFor="address-filter" className="sr-only">
            Filter the addresses
          </label>
          <Icon name="search" className="toolbar-icon" />
          <input
            id="address-filter"
            type="search"
            className="text-input toolbar-input"
            placeholder="Filter by address or type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="toolbar-field">
          <label htmlFor="address-sort" className="toolbar-label">
            Sort by
          </label>
          <select id="address-sort" className="text-input toolbar-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <p className="toolbar-count" role="status">
          {shown.length === addresses.length ? plural(addresses.length, 'address', 'addresses') : `${shown.length} of ${plural(addresses.length, 'address', 'addresses')}`}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="table-empty">No address matches “{filter.trim()}”.</p>
      ) : (
        <table className="address-table">
          <caption className="sr-only">Addresses in the snapshot, with their activity, how many transactions are scored and how many are unusual</caption>
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Active (UTC)</th>
              <th scope="col" className="num">
                Transactions
              </th>
              <th scope="col" className="num">
                Scored
              </th>
              <th scope="col" className="num">
                Unusual
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const pct = a.scoredCount ? Math.round((a.flaggedCount / a.scoredCount) * 100) : 0;
              return (
                <tr key={a.address}>
                  <th scope="row" data-label="Address">
                    <span className="address-cell">
                      <WatchStar address={a.address} />
                      <span>
                        <a className="address-link mono" href={paths.timeline(a.address, method ?? undefined)} aria-label={`Open activity for ${a.address}`}>
                          {shortAddress(a.address, 12, 8)}
                        </a>
                        <span className="cell-sub">
                          <span className="kind-chip">{KIND_LABEL[a.kind]}</span>
                          {a.source === 'live' ? ' · live data' : ''}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td data-label="Active (UTC)">{formatDayRange(dayKey(a.firstSeen), dayKey(a.lastSeen))}</td>
                  <td data-label="Transactions" className="num">
                    {formatCount(a.txCount)}
                  </td>
                  <td data-label="Scored" className="num">
                    {formatCount(a.scoredCount)}
                  </td>
                  <td data-label="Unusual" className="num">
                    {a.history === 'insufficient' ? (
                      <span className="badge badge-not-scored">Short history, not scored</span>
                    ) : a.flaggedCount > 0 ? (
                      <span className="unusual-cell">
                        <span className="unusual-count">
                          <Icon name="flag" className="flag-icon" /> {formatCount(a.flaggedCount)}{' '}
                          <span className="muted">({pct}% of scored)</span>
                        </span>
                        <span className="share-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(4, (shareOf(a) / maxShare) * 100)}%` }} />
                        </span>
                      </span>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
