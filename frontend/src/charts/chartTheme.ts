import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';

// Plotly draws with colours it is given, not with CSS, so the chart reads the stylesheet's
// tokens (src/styles/base.css) and passes them on. Light and dark each redefine the tokens,
// so reading them again after a theme switch is all it takes to recolour a chart.

export interface ChartPalette {
  /** Text and the strongest ink. */
  text: string;
  /** Axis labels and other secondary ink. */
  axisInk: string;
  grid: string;
  axis: string;
  /** Ordinary marks (blue). */
  ordinary: string;
  /** Unusual marks (gold in light mode, lemon in dark). Always paired with a shape or a word, never colour alone. */
  unusual: string;
  /** Marks that carry no verdict (grey). */
  neutral: string;
  /** Reference lines and bands. */
  reference: string;
  surface: string;
  surfaceRaised: string;
  borderStrong: string;
  fontFamily: string;
}

const TOKENS: Record<keyof ChartPalette, string> = {
  text: '--text',
  axisInk: '--axis-ink',
  grid: '--grid',
  axis: '--axis',
  ordinary: '--series-1',
  unusual: '--series-2',
  neutral: '--bar-neutral',
  reference: '--ref',
  surface: '--surface',
  surfaceRaised: '--surface-2',
  borderStrong: '--border-strong',
  fontFamily: '--font-sans',
};

export function readPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (token: string) => style.getPropertyValue(token).trim();
  return Object.fromEntries(Object.entries(TOKENS).map(([key, token]) => [key, read(token)])) as unknown as ChartPalette;
}

/**
 * The palette for the theme in force. It is read in an effect, after useTheme has written
 * data-theme on <html>, so a switch is never one step behind.
 */
export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  const [palette, setPalette] = useState(readPalette);
  useEffect(() => setPalette(readPalette()), [theme]);
  return palette;
}
