import { useEffect, useRef, useState, type FormEvent } from 'react';
import { paths } from '../lib/router';
import { Icon } from './Icon';

/**
 * The address lookup in the header, on every page. It hands the text to Screen 1's lookup (`#/?q=`), so the
 * same checks run: browser validation, the snapshot question, and the unsupported and live-lookup paths.
 * "/" focuses it from anywhere except a text field.
 */
export function HeaderSearch() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    window.location.hash = paths.lookup(text);
    setValue('');
    inputRef.current?.blur();
  }

  return (
    <form className="header-search" role="search" onSubmit={onSubmit}>
      <label htmlFor="header-search-input" className="sr-only">
        Look up a Bitcoin address
      </label>
      <Icon name="search" className="header-search-icon" />
      <input
        id="header-search-input"
        type="search"
        ref={inputRef}
        className="header-search-input mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Look up an address (1…, 3…, bc1…)"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <kbd className="header-search-key" aria-hidden="true">
        /
      </kbd>
    </form>
  );
}
