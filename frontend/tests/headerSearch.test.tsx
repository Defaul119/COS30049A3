// The header's address lookup (UI remake): on every page, handing the text to Screen 1's lookup, with "/" to focus it.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { App } from '../src/App';
import ex from '../src/api/mock/fixtures/examples.json';

function start(hash: string) {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

const search = () => screen.getByRole('searchbox', { name: 'Look up a Bitcoin address' });

describe('header search', () => {
  test('from another page, a snapshot address opens its timeline', async () => {
    const user = start('#/about');
    await user.type(search(), `${ex.mainAddress}{Enter}`);
    await waitFor(() => expect(window.location.hash).toBe(`#/address/${ex.mainAddress}`));
  });

  test('text that is not an address is answered by the lookup on Screen 1', async () => {
    const user = start('#/models');
    await user.type(search(), 'not-an-address{Enter}');
    await waitFor(() => expect(window.location.hash).toBe('#/?q=not-an-address'));
    const box = await screen.findByLabelText('Bitcoin address');
    expect(box).toHaveValue('not-an-address');
    await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
  });

  test('"/" focuses the search box, except while typing in a field', async () => {
    const user = start('#/about');
    await user.keyboard('/');
    expect(search()).toHaveFocus();
    await user.type(search(), 'a/b');
    expect(search()).toHaveValue('a/b');
  });

  test('an empty search stays where it is', async () => {
    const user = start('#/about');
    await user.click(search());
    await user.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/about');
  });
});
