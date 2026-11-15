import { useCallback, useMemo } from 'react';
import type { Data } from 'plotly.js';
import type { Direction, MethodId, ScoreStatus, TransactionRow } from '../api/types';
import { STATUS_TEXT } from '../components/Badges';
import { dayKey, formatDateTime, formatDay } from '../lib/dates';
import { DIRECTION_LABEL, formatBtc, formatCount, plural } from '../lib/format';
import { paths } from '../lib/router';
import { DIRECTIONS, STATUSES } from '../lib/transactionFilters';
import { useMethodLabels } from '../hooks/useMethods';
import { useSettings } from '../hooks/useSettings';
import { snapshotCaption } from './caption';
import type { Figure, FigureContext } from './chartFigure';
import type { ChartTable } from './chartTable';
import { PlotlyChart, type KeyboardStops } from './PlotlyChart';

// G2, transactions over time (plan section 9): one point per transaction, time on x and the absolute
// amount in BTC on a log y axis. Status is colour and shape (an unusual one is orange and a triangle,
// and the legend says the word); direction is filled (received) or outlined (sent); the size grows
// with the score. It answers: how large was each transaction, and where do the unusual ones sit?
// The rows are everything the filter bar lets through, joined from E6's pages by the caller.

const SATS_PER_BTC = 100_000_000;
const DAY_MS = 86_400_000;
/** A score at or above this draws the largest mark; scores run from 0 to a little over the flag line. */
const SIZE_SCORE_CAP = 8;
const MARK_MIN_PX = 6;
const MARK_SCORE_PX = 1.5;

type Kind = `${ScoreStatus}|${Direction}`;

const SYMBOL: Record<ScoreStatus, string> = { flagged: 'triangle-up', 'not-flagged': 'circle', 'not-scored': 'diamond' };
/** Every direction a row can have, including the net change of zero that the filter bar has no chip for. */
const ALL_DIRECTIONS: Direction[] = [...DIRECTIONS, 'none'];

interface Props {
  address: string;
  /** The deciding method the rows were scored by; links to a transaction keep it. */
  method: MethodId;
  rows: TransactionRow[];
  /**
   * Every row the address has, when `rows` is only part of them (the replay draws them one at a time): the axes
   * keep the extent of all of them, so the points fall into place instead of the axes stretching at every step.
   */
  frame?: TransactionRow[];
  /** Pages still arriving: the chart already draws what has come. */
  loading: { loaded: number; total: number } | null;
  /** Changes when the date filter does, so the chart's own zoom starts afresh with the new range. */
  revision: string;
  onOpenTransaction: (row: TransactionRow) => void;
  /** The time axis was zoomed to these days (inclusive), or reset (null). */
  onZoomDays: (days: { from: string; to: string } | null) => void;
  /**
   * With `onSelect` the tool bar has a box and a lasso tool, and the chart draws `selection` (the transactions picked,
   * and a number that changes with each new selection, so Plotly lets go of the one it holds). Left out, the chart cannot select.
   */
  selection?: { ids: ReadonlySet<string>; epoch: number } | null;
  /** The transactions inside a box or lasso, or null when the selection is cleared. */
  onSelect?: (rows: TransactionRow[] | null) => void;
}

const axisTime = (iso: string) => iso.slice(0, 19).replace('T', ' ');

/** A net amount of zero cannot be placed on a log axis; it sits on the floor, a third of the smallest real amount. */
function floorBtc(rows: TransactionRow[]): number {
  const smallest = Math.min(1, ...rows.filter((r) => r.netSats !== 0).map((r) => Math.abs(r.netSats) / SATS_PER_BTC));
  return smallest / 3;
}

/** The status in words; for an unusual transaction, the strongest reason. */
function statusLine(row: TransactionRow): string {
  if (row.status === 'flagged') return `Unusual: ${row.mainReason}`;
  return row.status === 'not-flagged' ? 'Not unusual' : 'Not scored: too little earlier history';
}

const hoverText = (row: TransactionRow) =>
  `${formatDateTime(row.time)}<br>${DIRECTION_LABEL[row.direction]} ${formatBtc(Math.abs(row.netSats))}<br>${statusLine(row)}` +
  `${row.score === null ? '' : `<br>Score ${row.score.toFixed(2)}`}<br>Select to open`;

/** Everything about the data that does not depend on the theme or the size. `frame` is what the axes must fit; it is the rows themselves unless the caller says otherwise. */
function buildModel(rows: TransactionRow[], frame: TransactionRow[] = rows) {
  // The keyboard visits transactions oldest first, each a point of its trace.
  const ordered = [...rows].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const kinds = STATUSES.flatMap((s) => ALL_DIRECTIONS.map((d): Kind => `${s}|${d}`)).filter((kind) => ordered.some((r) => `${r.status}|${r.direction}` === kind));
  const byKind = new Map(kinds.map((kind) => [kind, ordered.filter((r) => `${r.status}|${r.direction}` === kind)]));
  const placed = new Map(kinds.map((kind) => [kind, 0]));
  const stops: KeyboardStops['points'] = ordered.map((row) => {
    const kind: Kind = `${row.status}|${row.direction}`;
    const point = placed.get(kind)!;
    placed.set(kind, point + 1);
    return {
      curve: kinds.indexOf(kind),
      point,
      label: `${formatDateTime(row.time)}: ${DIRECTION_LABEL[row.direction]} ${formatBtc(Math.abs(row.netSats))}, ${STATUS_TEXT[row.status]}.`,
    };
  });
  const amounts = frame.filter((r) => r.netSats !== 0).map((r) => Math.abs(r.netSats));
  const decades = amounts.length > 0 ? Math.log10(Math.max(...amounts) / Math.min(...amounts)) : 0;
  const times = frame.map((r) => Date.parse(r.time));
  return {
    ordered,
    kinds,
    byKind,
    stops,
    decades,
    floor: floorBtc(frame),
    hasZero: frame.some((r) => r.netSats === 0),
    bounds: { first: Math.min(...times), last: Math.max(...times), top: Math.max(...frame.map((r) => Math.abs(r.netSats) / SATS_PER_BTC)), fixed: frame !== rows },
  };
}

type Model = ReturnType<typeof buildModel>;

const markSize = (row: TransactionRow) => MARK_MIN_PX + Math.min(Math.max(row.score ?? 0, 0), SIZE_SCORE_CAP) * MARK_SCORE_PX;

/** The amount axis of a log scale, in powers of ten, with a little room above and below the extremes. */
function amountRange(model: Model): [number, number] {
  const bottom = model.hasZero ? model.floor : Math.min(1, model.floor * 3);
  return [Math.log10(bottom) - 0.15, Math.log10(model.bounds.top) + 0.15];
}

/** Ticks for a log axis whose floor stands for zero: the floor is labelled 0 and each power of ten above it is named. */
function floorTicks(model: Model) {
  const { top } = model.bounds;
  const powers: number[] = [];
  for (let p = Math.ceil(Math.log10(model.floor)); 10 ** p <= top * 1.001; p++) powers.push(p);
  return { tickmode: 'array' as const, tickvals: [model.floor, ...powers.map((p) => 10 ** p)], ticktext: ['0', ...powers.map((p) => (10 ** p).toFixed(Math.max(0, -p)))] };
}

/** The time axis, padded so one transaction, or a few on one day, does not stretch a second across the plot. */
function timeRange(model: Model): [string, string] {
  const { first, last } = model.bounds;
  const pad = Math.max((last - first) * 0.03, DAY_MS);
  return [axisTime(new Date(first - pad).toISOString()), axisTime(new Date(last + pad).toISOString())];
}

/** A reset (double-click, or the reset button) puts the axis back on the range the figure asked for, which is no zoom at all. */
const isReset = (range: [string, string], model: Model): boolean => timeRange(model).every((end, i) => end.slice(0, 19) === range[i].slice(0, 19));

function buildFigure(model: Model, selection: Props['selection'], { palette, compact }: FigureContext): Figure {
  const colour: Record<ScoreStatus, string> = { flagged: palette.unusual, 'not-flagged': palette.ordinary, 'not-scored': palette.neutral };
  const data = model.kinds.map((kind): Data => {
    const [status, direction] = kind.split('|') as [ScoreStatus, Direction];
    const rows = model.byKind.get(kind)!;
    // The legend carries the words the marks stand for, so colour and shape are never the only signal.
    const name = `${status === 'flagged' ? '▲ ' : ''}${STATUS_TEXT[status]}, ${DIRECTION_LABEL[direction].toLowerCase()}`;
    return {
      type: 'scatter',
      mode: 'markers',
      name,
      x: rows.map((r) => axisTime(r.time)),
      y: rows.map((r) => (r.netSats === 0 ? model.floor : Math.abs(r.netSats) / SATS_PER_BTC)),
      // Received is a filled mark and anything else an outline of the same colour and shape.
      marker: { symbol: direction === 'in' ? SYMBOL[status] : `${SYMBOL[status]}-open`, color: colour[status], size: rows.map(markSize), line: { width: 1.5, color: colour[status] } },
      hovertext: rows.map(hoverText),
      hoverinfo: 'text',
      // Without a selection every point is drawn in full; Plotly dims the others once some are selected.
      ...(selection ? { selectedpoints: rows.flatMap((r, i) => (selection.ids.has(r.txid) ? [i] : [])) } : {}),
    } as Data;
  });

  return {
    data,
    layout: {
      hovermode: 'closest',
      selectionrevision: selection ? `selected-${selection.epoch}` : 'none',
      // The axes do not glide: a glide to a new range sends zoom events of its own, which would be read as the user zooming.
      transition: { duration: 0, easing: 'linear' },
      showlegend: true, // Plotly leaves the legend out for a single trace, and it is what names the marks
      // Room above the plot for the legend, which wraps onto more lines on a phone.
      margin: { t: compact ? 124 : 76, r: 16 },
      legend: { y: 1.02, tracegroupgap: 4 },
      xaxis: { type: 'date', range: timeRange(model), title: { text: 'Time (UTC)' } },
      yaxis: {
        type: 'log',
        title: { text: 'Amount (BTC, log scale)' },
        // A part of the rows is drawn against the axis of all of them; Plotly would otherwise fit the part.
        ...(model.bounds.fixed ? { range: amountRange(model) } : {}),
        // Plain decimals, trailing zeros trimmed, never 1e-5.
        tickformat: ',.8~f',
        // Over a narrow span Plotly labels every digit (2, 3, 4 ...), which crowds; label 1, 2 and 5 instead.
        ...(model.decades < 3 ? { dtick: 'D2' } : {}),
        ...(model.hasZero ? floorTicks(model) : {}),
      },
    },
  };
}

export function G2TransactionsOverTime({ address, method, rows, frame, loading, revision, onOpenTransaction, onZoomDays, selection, onSelect }: Props) {
  const { settings } = useSettings();
  const methodName = useMethodLabels()[method].name;
  const model = useMemo(() => buildModel(rows, frame), [rows, frame]);
  const figure = useCallback((context: FigureContext) => buildFigure(model, selection, context), [model, selection]);

  const table = useMemo<ChartTable>(
    () => ({
      columns: [{ label: 'Time (UTC)' }, { label: 'Direction' }, { label: 'Amount', numeric: true }, { label: 'Score', numeric: true }, { label: 'Status' }, { label: 'Main reason' }],
      rows: model.ordered.map((r) => [
        { text: formatDateTime(r.time), href: paths.tx(address, dayKey(r.time), r.txid, method) },
        { text: DIRECTION_LABEL[r.direction] },
        { text: formatBtc(r.netSats, { signed: true }) },
        { text: r.score === null ? '—' : r.score.toFixed(2) },
        { text: STATUS_TEXT[r.status] },
        { text: r.status === 'flagged' && r.mainReason ? r.mainReason : '—' },
      ]),
    }),
    [model, address, method],
  );

  const keyboard = useMemo<KeyboardStops>(
    () => ({
      points: model.stops,
      onOpen: (index) => onOpenTransaction(model.ordered[index]),
      instructions: 'Use the left and right arrow keys to move between transactions, oldest first, and Enter to open one.',
    }),
    [model, onOpenTransaction],
  );

  const counts = STATUSES.map((s) => model.ordered.filter((r) => r.status === s).length);
  const span = model.ordered.length > 0 ? ` from ${formatDay(dayKey(model.ordered[0].time))} to ${formatDay(dayKey(model.ordered[model.ordered.length - 1].time))}` : '';
  const summary =
    `Scatter chart of ${plural(rows.length, 'transaction')}${span}, by amount on a log scale: ` +
    `${counts[0]} unusual, ${counts[1]} not unusual, ${counts[2]} not scored.`;

  return (
    <PlotlyChart
      fileName={['transactions-over-time', address, settings.snapshot?.snapshotDate ?? '']}
      title="Transactions over time"
      headingLevel={2}
      caption={`${snapshotCaption(settings.snapshot, address)} · times in UTC · flagged by ${methodName}${loading ? ` · loading, ${formatCount(loading.loaded)} of ${formatCount(loading.total)} drawn` : ''}`}
      summary={summary}
      hint={`Select a point to open that transaction. Drag to zoom on the time axis, which also sets the dates above; double-click to reset.${onSelect ? ' The box and lasso tools in the tool bar select points instead, and the table then shows only those.' : ''} Filled marks were received and outlined marks were sent; the yellow triangles are unusual.`}
      figure={figure}
      table={table}
      revision={revision}
      height={460}
      onPointClick={({ curve, point }) => onOpenTransaction(model.byKind.get(model.kinds[curve])![point])}
      onSelect={onSelect && ((points) => onSelect(points && points.map(({ curve, point }) => model.byKind.get(model.kinds[curve])![point])))}
      onZoom={(range) => onZoomDays(isReset(range, model) ? null : { from: range[0].slice(0, 10), to: range[1].slice(0, 10) })}
      keyboard={keyboard}
    />
  );
}
