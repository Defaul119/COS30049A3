// Screen 1's address list after the remake: the snapshot summary, filtering and sorting (all in the browser).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { App } from '../src/App';

function start() {
  window.location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  return user;
}

const table = () => screen.findByRole('table', { name: /Addresses in the snapshot/ });
const links = async () => within(await table()).getAllByRole('link', { name: /^Open activity for / });
const unusualCounts = async () =>
  within(await table())
    .getAllByRole('row')
    .slice(1)
    .map((r) => {
      const cell = r.querySelector('td[data-label="Unusual"]')?.textContent ?? '';
      const m = cell.match(/(\d[\d,]*)\s*\(/);
      return m ? Number(m[1].replace(/,/g, '')) : 0;
    });

describe('home: the address list', () => {
  test('the summary adds up the snapshot', async () => {
    start();
    const summary = await screen.findByRole('region', { name: 'The snapshot at a glance' });
    const count = (await links()).length;
    expect(within(summary).getByText('Addresses').nextElementSibling).toHaveTextContent(String(count));
  });

  test('the filter narrows the list by address text, and says when nothing matches', async () => {
    const user = start();
    const all = (await links()).length;
    await user.type(screen.getByRole('searchbox', { name: 'Filter the addresses' }), 'bc1q');
    const some = await links();
    expect(some.length).toBeGreaterThan(0);
    expect(some.length).toBeLessThan(all);
    for (const link of some) expect(link.getAttribute('aria-label')).toMatch(/bc1q/i);
    expect(screen.getByText(new RegExp(`^${some.length} of ${all} addresses$`))).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Filter the addresses' }));
    await user.type(screen.getByRole('searchbox', { name: 'Filter the addresses' }), 'zzzz');
    expect(screen.getByText(/No address matches/)).toBeInTheDocument();
  });

  test('sorting by most unusual puts the most-flagged address first', async () => {
    const user = start();
    await table();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'unusual');
    const counts = await unusualCounts();
    for (let i = 1; i < counts.length; i++) expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
  });
});
