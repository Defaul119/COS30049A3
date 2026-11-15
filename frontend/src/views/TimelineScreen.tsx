import { Suspense, lazy, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MethodId, TimelineDay, TimelineResponse } from '../api/types';
import { G1DailyActivity } from '../charts/G1DailyActivity';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CopyButton } from '../components/CopyButton';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { MethodMenu } from '../components/MethodMenu';
import { PageHeading, useDocumentTitle } from '../components/PageHeading';
import { Loading, StatePanel } from '../components/StatePanel';
import { WatchStar } from '../components/WatchStar';
import { KIND_LABEL, validateAddress } from '../lib/address';
import { dayCount, dayKey, formatDay, formatDayRange } from '../lib/dates';
import { formatCount, formatSpanDays, plural, shortAddress } from '../lib/format';
import { navigate, paths } from '../lib/router';
import { methodSearch } from '../lib/methods';
import { useMethodLabels } from '../hooks/useMethods';
import { rememberAddress } from '../hooks/usePreferences';
import { useRequest } from '../hooks/useRequest';
import { useSettings } from '../hooks/useSettings';
import { ReplayPanel } from './ReplayPanel';
import { TransactionsTab } from './TransactionsTab';
import { WhatIfLab } from './WhatIfLab';

// The mark of a fetched address (S-09), with "Forget this address"; a snapshot address never loads it.
const LiveBanner = lazy(() => import('./LiveBanner'));

// Screen 2 — the address overview (FR-02, AC-01): date range, source and snapshot, the four tiles, and three
// tabs that are routes of their own. The overview tab has the daily timeline, with flagged days marked and
// a keyboard path to every flagged day; E5 supplies the days and totals, and E6 the strongest reason on each
// flagged day. The transactions tab (TransactionsTab) has the filter bar, chart G2 and the table.

/** Flagged days listed before "Show all" (plan section 8, V2). */
const DAYS_SHOWN = 8;

export type AddressTab = { name: 'overview' } | { name: 'transactions'; search: string } | { name: 'what-if'; search: string };

const TAB_TITLE: Record<AddressTab['name'], string> = { overview: 'Activity', transactions: 'Transactions', 'what-if': 'What-if' };

export function TimelineScreen({ address, tab, method }: { address: string; tab: AddressTab; method: MethodId }) {
  useDocumentTitle(`${TAB_TITLE[tab.name]} for ${shortAddress(address)}`);
  const timeline = useRequest(`timeline:${address}:${method}`, (signal) => api.timeline(address, { signal, method }));
  // After a change of method the answer for the old one stays on screen, dimmed, until the new one arrives.
  const shown = timeline.status === 'success' ? timeline.data : timeline.previous;
  // An address counts as opened once its page has loaded, so V1's "Recently opened" never lists one that failed.
  const opened = timeline.status === 'success';
  useEffect(() => {
    if (opened) rememberAddress(address);
  }, [opened, address]);

  return (
    <div className="page page-timeline">
      <Breadcrumbs items={[{ label: 'Addresses', href: paths.select() }, { label: shortAddress(address), mono: true }]} />
      {shown === undefined && timeline.status === 'loading' ? (
        <>
          <PageHeading className="sr-only">Activity for {address}</PageHeading>
          <Loading label="Loading this address's activity…" block />
        </>
      ) : null}
      {timeline.status === 'error' ? (
        <>
          <PageHeading>Address activity</PageHeading>
          <MethodMenu method={method} updating={false} />
          <ErrorState error={timeline.error} onRetry={timeline.retry} />
        </>
      ) : null}
      {shown !== undefined && timeline.status !== 'error' ? <Timeline data={shown} tab={tab} method={method} updating={timeline.status === 'loading'} /> : null}
    </div>
  );
}

function Timeline({ data, tab, method, updating }: { data: TimelineResponse; tab: AddressTab; method: MethodId; updating: boolean }) {
  const labels = useMethodLabels();
  const kind = validateAddress(data.address);
  const flaggedDays = data.days.filter((d) => d.flaggedCount > 0);
  const insufficient = data.history.status === 'insufficient';
  const [first, last] = [dayKey(data.range.start), dayKey(data.range.end)];
  const spanDays = dayCount(first, last);
  const open = (date: string) => navigate(paths.day(data.address, date, method));

  const sourceLine = data.live ? (
    <p className="source-line">Source: {data.snapshot.source} · live data · days in UTC</p>
  ) : (
    <p className="source-line">
      Source: {data.snapshot.source} · snapshot of {formatDay(data.snapshot.snapshotDate)} · days in UTC
      {data.snapshot.illustrative ? ' · illustrative data' : ''}
    </p>
  );

  const tabContent =
    tab.name === 'transactions' ? (
      <TransactionsTab timeline={data} search={tab.search} />
    ) : tab.name === 'what-if' ? (
      <WhatIfLab timeline={data} search={tab.search} />
    ) : null;

  return (
    <>
      {/* The address's profile: who it is, what can be done with it, and its key numbers in one block. */}
      <section className="card profile" aria-label="Address summary">
        <header className="page-head profile-top">
          <div className="profile-id">
            <p className="eyebrow">Address{kind.ok ? ` · ${KIND_LABEL[kind.kind]}` : ''}</p>
            <PageHeading className="address-title mono">{data.address}</PageHeading>
            {sourceLine}
          </div>
          <div className="profile-actions">
            <CopyButton value={data.address} label="address" />
            <WatchStar address={data.address} showText />
          </div>
          <div className="profile-method">
            <MethodMenu method={method} updating={updating} />
          </div>
        </header>
        {data.live ? (
          <Suspense fallback={null}>
            <LiveBanner address={data.address} live={data.live} />
          </Suspense>
        ) : null}

        <dl className={`stat-row metrics${updating ? ' is-updating' : ''}`} aria-busy={updating}>
          <div className="stat">
            <dt>Transactions</dt>
            <dd>{formatCount(data.totals.txCount)}</dd>
          </div>
          <div className="stat">
            <dt>Active</dt>
            <dd>
              {formatDayRange(first, last)}
              <span className="stat-sub">{plural(spanDays, 'calendar day')}</span>
            </dd>
          </div>
          <div className="stat stat-unusual">
            <dt>Unusual</dt>
            <dd>
              {insufficient ? (
                'Not scored'
              ) : (
                <>
                  {formatCount(data.totals.flaggedCount)}
                  <span className="stat-sub">
                    on {plural(data.totals.flaggedDays, 'day')} by {labels[data.snapshot.method.id].name}
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="stat">
            <dt>Scored</dt>
            <dd>
              {formatCount(data.totals.scoredCount)} of {formatCount(data.totals.txCount)}
              <span className="stat-sub">enough earlier history</span>
            </dd>
          </div>
        </dl>
      </section>

      {/* One tree for every tab, so the tab bar stays mounted (and keeps focus) when the tab changes. */}
      <div className={`address-grid${tab.name === 'overview' ? ' has-rail' : ''}${updating ? ' is-updating' : ''}`} aria-busy={updating}>
        <div className="address-main">
          {tab.name === 'overview' && insufficient ? (
            <StatePanel
              tone="warning"
              title="Not enough history to score this address"
              testId="state-insufficient"
              actions={
                <>
                  <a className="btn btn-secondary" href={paths.transactions(data.address, methodSearch(method))}>
                    Browse its transactions anyway
                  </a>
                  <a className="btn btn-ghost" href={paths.select()}>
                    Choose an address with more history
                  </a>
                </>
              }
            >
              <p>
                A transaction is only scored once the address has at least {data.history.required.minTx} earlier transactions
                over at least {data.history.required.minSpanDays} days. This address has{' '}
                {plural(data.history.txCount, 'transaction')} spanning {formatSpanDays(data.history.spanDays)}, so there is nothing
                reliable to compare against yet. Its transactions are listed but none is marked unusual.
              </p>
            </StatePanel>
          ) : null}
          <div className={`card tab-card${tab.name === 'overview' ? '' : ' tab-card-bare'}`}>
            <AddressTabs address={data.address} tab={tab.name} method={method} />
            {tab.name === 'overview' ? (
              <div className="tab-card-body">
                <G1DailyActivity timeline={data} onOpenDay={open} />
              </div>
            ) : null}
          </div>
          {tabContent}
        </div>
        {tab.name === 'overview' ? (
          <aside className="rail" aria-label="Unusual activity">
            <FlaggedDays address={data.address} days={flaggedDays} insufficient={insufficient} method={method} />
          </aside>
        ) : null}
      </div>
      {tab.name === 'overview' ? <ReplayPanel timeline={data} method={method} /> : null}
    </>
  );
}

/** The tabs are routes, so they are links; the current one is marked for assistive technology as well as by its look. */
function AddressTabs({ address, tab, method }: { address: string; tab: AddressTab['name']; method: MethodId }) {
  const tabs = [
    { name: 'overview', label: 'Overview', href: paths.timeline(address, method) },
    { name: 'transactions', label: 'Transactions', href: paths.transactions(address, methodSearch(method)) },
    { name: 'what-if', label: 'What-if', href: paths.whatIf(address, undefined, method) },
  ] as const;
  return (
    <nav className="tabs" aria-label="Views of this address">
      <ul>
        {tabs.map((t) => (
          <li key={t.name}>
            <a href={t.href} aria-current={t.name === tab ? 'page' : undefined}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FlaggedDays({ address, days, insufficient, method }: { address: string; days: TimelineDay[]; insufficient: boolean; method: MethodId }) {
  const { settings } = useSettings();
  const [showAll, setShowAll] = useState(false);
  // The strongest flagged transactions first, so the first row met for a day gives its reason.
  const flagged = useRequest(days.length > 0 ? `flagged:${address}:${method}` : null, (signal) =>
    api.transactions(address, { status: ['flagged'], sort: '-score', pageSize: settings.web.lists.maxPageSize, method }, { signal }),
  );
  const reasons = new Map<string, string>();
  if (flagged.status === 'success') {
    for (const row of flagged.data.transactions) {
      if (row.mainReason && !reasons.has(dayKey(row.time))) reasons.set(dayKey(row.time), row.mainReason);
    }
  }
  const newestFirst = [...days].reverse();
  const shown = showAll ? newestFirst : newestFirst.slice(0, DAYS_SHOWN);

  return (
    <section className="card flagged-card" aria-labelledby="flagged-title">
      <h2 id="flagged-title">Days with unusual transactions</h2>
      {days.length > 0 ? (
        <>
          <p className="card-sub">
            {plural(days.length, 'day')}, newest first. Open one to see which transactions stand out and why.
          </p>
          <ul className="day-list">
            {shown.map((d) => (
              <li key={d.date}>
                <a className="day-link" href={paths.day(address, d.date, method)}>
                  <Icon name="flag" className="flag-icon" />
                  <span className="day-link-date">{formatDay(d.date)}</span>
                  <span className="day-link-count">
                    {d.flaggedCount} of {plural(d.txCount, 'transaction')}
                    {reasons.has(d.date) ? ` · ${reasons.get(d.date)}` : ''}
                  </span>
                  <Icon name="chevron-right" className="day-link-arrow" />
                </a>
              </li>
            ))}
          </ul>
          {days.length > DAYS_SHOWN ? (
            <button type="button" className="btn btn-secondary show-all" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer days' : `Show all ${days.length} days`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="card-sub">
          {insufficient ? 'None: this address has too little history to score.' : 'None: no transaction on this address reached the flag level.'}
        </p>
      )}
    </section>
  );
}
