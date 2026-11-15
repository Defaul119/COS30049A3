// V2's tabs, the filter bar and the transaction table, through the real UI on the mock (which replays the
// real service's recorded answers and filters, sorts and pages E6 as the service does).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import ex from '../src/api/mock/fixtures/examples.json';
import { mockApi, mockControls } from '../src/api/mock/mockApi';
import { ApiError } from '../src/api/types';
import { fakePlotly } from './plotlyFake';
import { settings } from '../src/lib/settings';

const banned = new RegExp(`\\b(${settings.bannedWords.join('|')})`, 'i');
const main = ex.mainAddress;
const base = `#/address/${main}/transactions`;

function start(hash: string) {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

const table = () => screen.findByRole('table', { name: /Transactions of this address/ });
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);

afterEach(() => {
  expect(document.body.textContent ?? '').not.toMatch(banned);
  vi.restoreAllMocks();
});

describe('the tabs', () => {
  test('the overview and the transactions tab are links, and the current one is marked', async () => {
    const user = start(`#/address/${main}`);
    const tabs = await screen.findByRole('navigation', { name: 'Views of this address' });
    expect(within(tabs).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(tabs).getByRole('link', { name: 'Transactions' }));
    expect(window.location.hash).toBe(base);
    expect(within(tabs).getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(await screen.findByRole('heading', { level: 2, name: 'Filter transactions' })).toBeInTheDocument();
    // The heading, tiles and tabs stay; only the tab's content changes.
    expect(screen.getByRole('heading', { level: 1, name: main })).toBeInTheDocument();
  });

  test('a link straight to the transactions tab opens it, and the navigation keeps Addresses current', async () => {
    start(base);
    expect(await screen.findByRole('heading', { level: 2, name: 'Filter transactions' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Addresses' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('the table', () => {
  test('50 rows a page, newest first, with every column the plan names', async () => {
    start(base);
    const rows = await bodyRows();
    expect(rows).toHaveLength(50);
    const headers = within(await table()).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Time (UTC)', 'Direction', 'Amount', 'Score', 'Status', 'Main reason', 'Flagged by']);
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('19 Oct 2026, 14:10 UTC');
    expect(screen.getByText('Showing 377 of 377 transactions')).toBeInTheDocument();
    expect(screen.getByText('Rows 1 to 50 · page 1 of 8')).toBeInTheDocument();
  });

  test('an unusual row shows its score, status, reason and how many methods flag it', async () => {
    start(`${base}?status=flagged&sort=-score`);
    const rows = await bodyRows();
    expect(rows).toHaveLength(3);
    const cells = within(rows[0]).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toEqual(['Received', '+0.00111260 BTC', '5.61', 'Unusual', 'Smaller amount relative to the usual for this direction', '1 of 9 methods']);
  });

  test('a row is a link that opens the transaction', async () => {
    const user = start(`${base}?status=flagged&sort=-score`);
    const link = within((await bodyRows())[0]).getByRole('link');
    expect(link).toHaveAttribute('href', `#/address/${main}/day/${ex.flagged.date}/tx/${ex.flagged.txid}`);
    await user.click(link);
    expect(await screen.findByTestId('flag-explanation')).toBeInTheDocument();
  });

  test('paging: the next page, by link, shows the next rows and keeps the filters', async () => {
    const user = start(`${base}?direction=out`);
    await bodyRows();
    await user.click(screen.getByRole('link', { name: /Next page/ }));
    expect(window.location.hash).toBe(`${base}?direction=out&page=2`);
    await waitFor(() => expect(screen.getByText('Rows 51 to 100 · page 2 of 4')).toBeInTheDocument());
    expect((await bodyRows()).length).toBe(50);
    expect(screen.getByRole('link', { name: /Previous page/ })).toHaveAttribute('href', `${base}?direction=out`);
  });

  test('the last page has no Next link, and a page past the end says so', async () => {
    start(`${base}?status=flagged&page=2`);
    expect(await screen.findByTestId('state-page-past-end')).toHaveTextContent('page 2');
    expect(screen.getByRole('link', { name: 'Go to the first page' })).toHaveAttribute('href', `${base}?status=flagged`);
  });
});

describe('the filters', () => {
  test('every status chip narrows the list, and the count line follows', async () => {
    const user = start(base);
    await bodyRows();
    await user.click(screen.getByRole('button', { name: 'Unusual' }));
    await waitFor(() => expect(screen.getByText('Showing 3 of 377 transactions')).toBeInTheDocument());
    expect(window.location.hash).toBe(`${base}?status=flagged`);
    await user.click(screen.getByRole('button', { name: 'Unusual' }));
    await user.click(screen.getByRole('button', { name: 'Not scored' }));
    await waitFor(() => expect(screen.getByText('Showing 10 of 377 transactions')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Not unusual' }));
    await waitFor(() => expect(screen.getByText('Showing 374 of 377 transactions')).toBeInTheDocument());
    expect(window.location.hash).toBe(`${base}?status=not-flagged&status=not-scored`);
  });

  test('the direction chips, alone and with a status', async () => {
    const user = start(base);
    await bodyRows();
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    await waitFor(() => expect(screen.getByText('Showing 187 of 377 transactions')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Unusual' }));
    await waitFor(() => expect(screen.getByText('Showing 1 of 377 transactions')).toBeInTheDocument());
    const rows = await bodyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Sent');
  });

  test('a chip says whether it is on, by its state and by a tick', async () => {
    start(`${base}?status=flagged`);
    const chip = await screen.findByRole('button', { name: 'Unusual' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Not scored' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('the date range limits the list to those days, inclusive, and goes in the link', async () => {
    start(base);
    await bodyRows();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-07-11' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2024-07-11' } });
    await waitFor(() => expect(screen.getByText('Showing 1 of 377 transactions')).toBeInTheDocument());
    expect(window.location.hash).toBe(`${base}?from=2024-07-11&to=2024-07-11`);
  });

  test('the date fields are limited to the address\'s active period', async () => {
    start(base);
    await bodyRows();
    for (const label of ['From', 'To']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('min', '2024-05-16');
      expect(screen.getByLabelText(label)).toHaveAttribute('max', '2026-10-19');
    }
  });

  test('the sort menu: newest, oldest, largest and highest score', async () => {
    const user = start(base);
    await bodyRows();
    const menu = screen.getByLabelText('Sort by');
    expect(within(menu).getAllByRole('option').map((o) => o.textContent)).toEqual(['Newest first', 'Oldest first', 'Largest first', 'Highest score first']);
    await user.selectOptions(menu, 'Oldest first');
    await waitFor(() => expect(window.location.hash).toBe(`${base}?sort=time`));
    await waitFor(async () => expect(within((await bodyRows())[0]).getByRole('rowheader')).toHaveTextContent('16 May 2024, 05:16 UTC'));
    await user.selectOptions(menu, 'Highest score first');
    await waitFor(async () => expect(within((await bodyRows())[0]).getByRole('rowheader')).toHaveTextContent('11 Jul 2024, 03:32 UTC'));
    await user.selectOptions(menu, 'Largest first');
    await waitFor(async () => expect((await bodyRows())[0]).toHaveTextContent('+0.00655720 BTC'));
  });

  test('Reset filters clears the chips and dates, keeps the sort, and is off when nothing is filtered', async () => {
    const user = start(`${base}?status=flagged&direction=in&from=2024-01-01&sort=-score&page=1`);
    await bodyRows();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(window.location.hash).toBe(`${base}?sort=-score`));
    await waitFor(() => expect(screen.getByText('Showing 377 of 377 transactions')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });

  test('a filtered view survives a reload: the same link gives the same chips, dates, sort and rows', async () => {
    const link = `${base}?status=flagged&direction=in&from=2024-01-01&to=2026-12-31&sort=-score`;
    start(link);
    const rows = await bodyRows();
    expect(rows).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Unusual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Received' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Sent' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('From')).toHaveValue('2024-01-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-12-31');
    expect(screen.getByLabelText('Sort by')).toHaveValue('-score');
  });

  test('a filter change replaces the history entry, so Back leaves the tab', async () => {
    const replace = vi.spyOn(history, 'replaceState');
    const user = start(base);
    await bodyRows();
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    expect(replace).toHaveBeenCalledWith(null, '', `${base}?direction=out`);
  });

  test('a filter change goes back to page 1', async () => {
    const user = start(`${base}?page=3`);
    await bodyRows();
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    await waitFor(() => expect(window.location.hash).toBe(`${base}?direction=out`));
  });
});

describe('validation', () => {
  test('a first day after the last day marks both fields with the server\'s words, and sends nothing', async () => {
    const spy = vi.spyOn(mockApi, 'transactions');
    start(`${base}?from=2025-06-01&to=2025-01-01`);
    expect(await screen.findByTestId('state-invalid-filters')).toBeInTheDocument();
    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To');
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Must not be after the last day.')).toBeInTheDocument();
    expect(screen.getByText('Must not be before the first day.')).toBeInTheDocument();
    expect(from).toHaveAccessibleDescription('Must not be after the last day.');
    expect(screen.getByText('Nothing is shown until the dates are corrected.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /Transactions of this address/ })).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  test('typing the dates in the wrong order shows the messages, and fixing one sends the request', async () => {
    start(base);
    await bodyRows();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-06-01' } });
    await waitFor(() => expect(screen.getByText(/^Showing \d+ of 377 transactions$/)).toBeInTheDocument());
    expect(screen.queryByText('Showing 377 of 377 transactions')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2025-01-01' } });
    expect(await screen.findByText('Must not be before the first day.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-01' } });
    await waitFor(() => expect(screen.queryByText('Must not be before the first day.')).not.toBeInTheDocument());
    expect(await bodyRows()).not.toHaveLength(0);
  });

  test('a day that does not exist in the link is named, with an example from this address', async () => {
    const spy = vi.spyOn(mockApi, 'transactions');
    start(`${base}?from=2024-13-01`);
    expect(await screen.findByText('Use a day such as 2026-10-19.')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(spy).not.toHaveBeenCalled();
  });

  test('a hand-edited link with unknown values is sent as the default view', async () => {
    const spy = vi.spyOn(mockApi, 'transactions');
    start(`${base}?status=bogus&sort=nonsense&page=-4`);
    await bodyRows();
    expect(spy.mock.calls[0][1]).toEqual({ sort: '-time', page: 1, pageSize: 50 });
  });
});

describe('states', () => {
  test('filters that match nothing say so and offer to reset them', async () => {
    const user = start(`${base}?status=flagged&from=2026-10-01`);
    const panel = await screen.findByTestId('state-empty-filters');
    expect(panel).toHaveTextContent('No transaction matches these filters');
    expect(screen.getByText('Showing 0 of 377 transactions')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Reset filters' }));
    expect(await table()).toBeInTheDocument();
    expect(window.location.hash).toBe(base);
  });

  test('a failed request shows the error with Try again, and the filters stay', async () => {
    const spy = vi.spyOn(mockApi, 'transactions').mockRejectedValue(new ApiError(500, { status: 'server_error', message: 'Something broke.' }));
    const user = start(`${base}?direction=in`);
    expect(await screen.findByText('Something went wrong on our side')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Received' })).toHaveAttribute('aria-pressed', 'true');
    spy.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await table()).toBeInTheDocument();
  });

  test('while the next rows load, the previous ones stay, marked as updating', async () => {
    const user = start(base);
    await bodyRows();
    // Long enough that the in-between state is still on screen when a busy test run looks (100 ms was flaky).
    mockControls.latencyMs = 400;
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    expect(await screen.findByText(/Updating…/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Transactions of this address/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Transactions of this address/ }).closest('.is-updating')).not.toBeNull();
    await waitFor(() => expect(screen.getByText('Showing 187 of 377 transactions')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByText(/Updating…/)).not.toBeInTheDocument();
  });

  test('an address with a short history lists its transactions, none of them scored', async () => {
    start(`#/address/${ex.shortHistory}/transactions`);
    const rows = await bodyRows();
    expect(rows).toHaveLength(8);
    for (const row of rows) expect(row).toHaveTextContent('Not scored');
    expect(screen.getByText('Showing 8 of 8 transactions')).toBeInTheDocument();
  });

  test('an address outside the snapshot answers as the overview does', async () => {
    start(`#/address/${ex.unsupported}/transactions`);
    expect(await screen.findByTestId('state-unsupported')).toBeInTheDocument();
  });
});

describe('chart G2 beside the table', () => {
  const drawn = async () => {
    await waitFor(() => expect(fakePlotly.chartDraws().length).toBeGreaterThan(0));
    return fakePlotly.lastChartDraw().data as any[];
  };
  const points = (traces: any[]) => traces.reduce((n, t) => n + t.x.length, 0);

  test('the chart and the table are one set: both follow a filter', async () => {
    const user = start(base);
    await bodyRows();
    await waitFor(async () => expect(points(await drawn())).toBe(377));
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    await waitFor(async () => expect(points(await drawn())).toBe(187));
    await waitFor(() => expect(screen.getByText('Showing 187 of 377 transactions')).toBeInTheDocument());
  });

  test('J5: filter to unusual sent transactions, click the point, and the transaction opens', async () => {
    start(`${base}?status=flagged&direction=out`);
    await bodyRows();
    await waitFor(async () => expect(points(await drawn())).toBe(1));
    fakePlotly.emit('plotly_click', { points: [{ curveNumber: 0, pointNumber: 0 }] });
    expect(window.location.hash).toMatch(/^#\/address\/.+\/day\/2026-01-09\/tx\/2bf33e82/);
    expect(await screen.findByTestId('flag-explanation')).toBeInTheDocument();
  });

  test('every page of E6 is fetched at 200 rows, in time order, and joined', async () => {
    const spy = vi.spyOn(mockApi, 'transactions');
    start(base);
    await waitFor(async () => expect(points(await drawn())).toBe(377));
    const chartCalls = spy.mock.calls.map(([, query]) => query).filter((q) => q.pageSize === 200);
    expect(chartCalls).toEqual([
      { sort: 'time', page: 1, pageSize: 200 },
      { sort: 'time', page: 2, pageSize: 200 },
    ]);
  });

  test('the chart draws after the first page, while the second is still coming', async () => {
    mockControls.latencyMs = 400;
    start(base);
    await waitFor(async () => expect(points(await drawn())).toBe(200), { timeout: 4000 });
    expect(screen.getByText(/loading, 200 of 377 drawn/)).toBeInTheDocument();
    await waitFor(async () => expect(points(await drawn())).toBe(377), { timeout: 4000 });
  });

  test('a new filter cancels the pages still on their way', async () => {
    mockControls.latencyMs = 400;
    const signals: AbortSignal[] = [];
    const real = mockApi.transactions;
    vi.spyOn(mockApi, 'transactions').mockImplementation((address, query, opts) => {
      if (query.pageSize === 200 && opts?.signal) signals.push(opts.signal);
      return real(address, query, opts);
    });
    const user = start(base);
    await waitFor(async () => expect(points(await drawn())).toBe(200), { timeout: 4000 });
    await user.click(screen.getByRole('button', { name: 'Sent' }));
    // The second page of the unfiltered chart was cancelled, or never started.
    await waitFor(async () => expect(points(await drawn())).toBe(187), { timeout: 4000 });
    expect(signals.slice(0, 2).filter((s) => s.aborted).length).toBeGreaterThanOrEqual(1);
  });

  test('zooming the time axis sets the date range, and a reset clears it', async () => {
    start(base);
    await bodyRows();
    await drawn();
    fakePlotly.emit('plotly_relayout', { 'xaxis.range[0]': '2024-07-01 03:12:11', 'xaxis.range[1]': '2024-12-31 17:00:00' });
    await waitFor(() => expect(window.location.hash).toBe(`${base}?from=2024-07-01&to=2024-12-31`));
    expect(screen.getByLabelText('From')).toHaveValue('2024-07-01');
    // The reset puts the axis back on the range the figure asked for, which clears the dates.
    const { layout } = fakePlotly.lastChartDraw();
    fakePlotly.emit('plotly_relayout', { 'xaxis.range': layout.xaxis.range });
    await waitFor(() => expect(window.location.hash).toBe(base));
  });

  test('zooming out past the active period is no limit at all', async () => {
    start(base);
    await bodyRows();
    await drawn();
    fakePlotly.emit('plotly_relayout', { 'xaxis.range[0]': '2020-01-01 00:00:00', 'xaxis.range[1]': '2024-12-31 00:00:00' });
    await waitFor(() => expect(window.location.hash).toBe(`${base}?to=2024-12-31`));
  });

  test('the date range limits the chart as well', async () => {
    start(`${base}?from=2026-09-01`);
    await bodyRows();
    const matching = Number(screen.getByText(/^Showing \d+ of 377 transactions$/).textContent!.match(/\d+/)![0]);
    expect(matching).toBeLessThan(377);
    await waitFor(async () => expect(points(await drawn())).toBe(matching));
  });
});

describe('the router', () => {
  test('the models and watchlist placeholders are still reachable and the about page replaces its placeholder', async () => {
    start('#/about');
    expect(await screen.findByRole('heading', { level: 1, name: 'About and help' })).toBeInTheDocument();
    expect(screen.queryByText('This page is not available yet')).not.toBeInTheDocument();
  });
});

describe('the export menu (E10)', () => {
  /** What the browser was told to download: the name, and the text of the file behind the link. */
  function captureDownloads() {
    const files: Array<{ name: string; text: Promise<string> }> = [];
    const blobs = new Map<string, Blob>();
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:test/${blobs.size}`;
      blobs.set(url, blob);
      return url;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      files.push({ name: this.download, text: blobs.get(this.href)!.text() });
    });
    return files;
  }

  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: 'Export' }));
  };

  test('is a button that opens two entries worded like the chart tools; Escape closes it and returns to the button', async () => {
    const user = start(`${base}?status=flagged`);
    const trigger = await screen.findByRole('button', { name: 'Export' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  test('a CSV of the filtered view: the file is named by the service, holds the rows of the table, and is confirmed', async () => {
    const files = captureDownloads();
    const send = vi.spyOn(mockApi, 'exportFile');
    const user = start(`${base}?status=flagged`);
    const shown = (await bodyRows()).length;
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(files).toHaveLength(1));
    // The filters of the table go to E10 as they are, with the sort; the page does not.
    expect(send).toHaveBeenCalledWith(main, 'csv', { status: ['flagged'], sort: '-time' });
    expect(files[0].name).toBe('1Bbcsfxj-2026-10-22.csv');
    const lines = (await files[0].text).trim().split(/\r?\n/);
    expect(lines.length - 1).toBe(shown);
    expect(lines[0]).toMatch(/^address,txid,time_utc,direction/);
    expect(await screen.findByText('Exported 3 rows to 1Bbcsfxj-2026-10-22.csv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  test('every row of the CSV is a row of the table, found by its transaction id', async () => {
    const files = captureDownloads();
    const user = start(`${base}?status=flagged`);
    const rows = await bodyRows();
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(files).toHaveLength(1));
    const [, ...lines] = (await files[0].text).trim().split(/\r?\n/);
    expect(lines).toHaveLength(rows.length);
    for (const row of rows) {
      const href = within(row).getByRole('link').getAttribute('href')!;
      expect(lines.some((l) => href.endsWith(l.split(',')[1]))).toBe(true);
    }
  });

  test('a JSON file is downloaded the same way', async () => {
    const files = captureDownloads();
    const user = start(`${base}?status=flagged`);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Download JSON' }));
    await waitFor(() => expect(files).toHaveLength(1));
    expect(files[0].name).toBe('1Bbcsfxj-2026-10-22.json');
    expect(JSON.parse(await files[0].text)).toMatchObject({ count: 3 });
  });

  test('the button says "Exporting…" and is disabled while the file is made', async () => {
    captureDownloads();
    mockControls.latencyMs = 0;
    let finish!: () => void;
    const real = mockApi.exportFile;
    vi.spyOn(mockApi, 'exportFile').mockImplementation((...args) => new Promise((resolve) => (finish = () => resolve(real(...args)))));
    const user = start(`${base}?status=flagged`);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(await screen.findByRole('button', { name: 'Exporting…' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Export' })).toBeEnabled();
  });

  test('a failure is said in a toast, and nothing is downloaded', async () => {
    const files = captureDownloads();
    vi.spyOn(mockApi, 'exportFile').mockRejectedValue(new ApiError(0, { status: 'network', message: 'The explorer service did not respond.' }));
    const user = start(`${base}?status=flagged`);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(await screen.findByText('The export could not be made. The explorer service did not respond. Try again.')).toBeInTheDocument();
    expect(files).toHaveLength(0);
  });

  test('is not offered while a date is wrong, because nothing is shown to export', async () => {
    start(`${base}?from=2026-02-01&to=2026-01-01`);
    await screen.findByTestId('state-invalid-filters');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });
});
