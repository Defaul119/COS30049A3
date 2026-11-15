import { useCallback, useId, useMemo } from 'react';
import type { Annotations, Data, LayoutAxis, Shape } from 'plotly.js';
import type { CurveMethod, MethodId, WhatIfCurve, WhatIfResult } from '../api/types';
import { useMethodLabels } from '../hooks/useMethods';
import { useSettings } from '../hooks/useSettings';
import { amountTicks, crossings, describeCurve, flagNear, flaggedRuns, runBounds, scoreAt, type CurveLine } from '../lib/curve';
import { formatBtc, formatBtcRounded } from '../lib/format';
import { snapshotCaption } from './caption';
import type { Figure, FigureContext } from './chartFigure';
import type { ChartTable } from './chartTable';
import { PlotlyChart, type KeyboardStops } from './PlotlyChart';

// G5, what-if response (plan section 9): the score a method gives as the amount grows, on a log
// amount axis. A dashed line is the method's flag line, the stretches it flags are shaded, a dotted
// line marks the address's usual amount, a cross marks each place the curve meets the flag line and a
// diamond marks the amount in the form. It answers: how does the score change with the amount, and
// where does it cross the flag line? A menu switches to another method, with its own flag line;
// selecting a point of the curve (or Enter on one) sets the form's amount.

const SATS_PER_BTC = 100_000_000;

interface Props {
  curve: WhatIfCurve;
  address: string;
  /** The method drawn; the menu changes it. */
  methodId: MethodId;
  onMethodChange: (id: MethodId) => void;
  /** The amount in the form; `answer` is E8's answer for exactly that amount, once it has arrived. */
  marker: { amountBtc: number; answer: Pick<WhatIfResult, 'scores' | 'flags'> | null } | null;
  /** The user selected a point of the curve: its amount, in BTC. */
  onPickAmount: (btc: number) => void;
}

const lineOf = (method: CurveMethod, amounts: number[]): CurveLine => ({ amounts, scores: method.scores, flags: method.flags, threshold: method.threshold });

/** The curve's amounts in plain decimals, as every axis of amounts in the Explorer is written (G2). */
const AMOUNT_FORMAT = ',.8~f';

/** A crossing within this share of the curve's width from either end is labelled towards the middle. */
const EDGE_SHARE = 0.35;

/** What the axis labels cannot use of the chart's width: the left margin with the axis title and the right margin. */
const PLOT_MARGINS_PX = 80;

function buildFigure(line: CurveLine, curve: WhatIfCurve, methodName: string, marker: Props['marker'], answer: number | null, flaggedAtMarker: boolean, { palette, compact, width }: FigureContext): Figure {
  const { amounts } = line;
  const scored = line.scores.filter((s): s is number => s !== null);
  const [low, high] = [Math.min(...scored, line.threshold), Math.max(...scored, line.threshold)];
  const pad = (high - low) * 0.12 || 1;
  // Ticks are chosen for the room there is: the labels are long decimals, and on a log axis Plotly would otherwise fit 1, 2 and 5 of every decade, which collide.
  const tickValues = amountTicks(amounts[0], amounts[amounts.length - 1], width - PLOT_MARGINS_PX, compact ? 11 : 12);
  const ticks: Partial<LayoutAxis> = tickValues.length >= 2 ? { tickmode: 'array', tickvals: tickValues } : { dtick: 'D2' };

  const curveTrace: Data = {
    type: 'scatter',
    mode: 'lines+markers',
    name: `${methodName} score`,
    x: amounts,
    y: line.scores,
    line: { color: palette.ordinary, width: 2 },
    // A flagged amount is an orange triangle and the others blue circles, so the legend and the shape say so as well as the colour.
    marker: { symbol: line.flags.map((f) => (f ? 'triangle-up' : 'circle')), color: line.flags.map((f) => (f ? palette.unusual : palette.ordinary)), size: 7 },
    hovertext: amounts.map((a, i) => `${formatBtc(Math.round(a * SATS_PER_BTC))}<br>Score ${line.scores[i]?.toFixed(2) ?? '—'}<br>${line.flags[i] ? 'Flagged' : 'Not flagged'}<br>Select to use this amount`),
    hoverinfo: 'text',
  };

  const cross = crossings(line);
  const crossTrace: Data[] = cross.length === 0 ? [] : [
    {
      type: 'scatter',
      mode: 'text+markers',
      name: 'Crosses the flag line',
      x: cross,
      y: cross.map(() => line.threshold),
      marker: { symbol: 'x', size: 11, color: palette.text, line: { width: 2, color: palette.text } },
      text: cross.map(formatBtcRounded),
      // A crossing near an edge of the plot writes its label inward, so the label is not cut off or drawn over the axis.
      // Plotly takes one position per point; the type definitions only allow one for all of them, hence the cast below.
      textposition: cross.map((a) => {
        const place = (Math.log10(a) - Math.log10(amounts[0])) / (Math.log10(amounts[amounts.length - 1]) - Math.log10(amounts[0]));
        return place < EDGE_SHARE ? 'top right' : place > 1 - EDGE_SHARE ? 'top left' : 'top center';
      }),
      textfont: { color: palette.text, size: 12 },
      hovertext: cross.map((a) => `Crosses the flag line at about ${formatBtcRounded(a)}`),
      hoverinfo: 'text',
    } as unknown as Data,
  ];

  const markerTrace: Data[] = marker && answer !== null ? [
    {
      type: 'scatter',
      mode: 'markers',
      name: 'Amount in the form',
      x: [marker.amountBtc],
      y: [answer],
      marker: { symbol: flaggedAtMarker ? 'diamond' : 'diamond-open', size: 13, color: flaggedAtMarker ? palette.unusual : palette.text, line: { width: 2, color: flaggedAtMarker ? palette.unusual : palette.text } },
      hovertext: `${formatBtc(Math.round(marker.amountBtc * SATS_PER_BTC))}<br>Score ${answer.toFixed(2)}<br>${flaggedAtMarker ? 'Flagged' : 'Not flagged'}`,
      hoverinfo: 'text',
    } as Data,
  ] : [];

  // Legend entries for the marks that are shapes, which the legend cannot show.
  const key = (name: string, extra: Partial<Data>): Data => ({ type: 'scatter', x: [null], y: [null], name, hoverinfo: 'skip', ...extra }) as Data;
  const keys: Data[] = [
    key(`Flag line, ${line.threshold.toFixed(2)}`, { mode: 'lines', line: { color: palette.unusual, width: 2, dash: 'dash' } }),
    key('Flagged amounts', { mode: 'markers', marker: { symbol: 'square', size: 12, color: palette.unusual, opacity: 0.25 } }),
    ...(curve.usualBtc === null ? [] : [key('Usual amount', { mode: 'lines', line: { color: palette.reference, width: 2, dash: 'dot' } })]),
  ];

  const shapes: Array<Partial<Shape>> = [
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: line.threshold, y1: line.threshold, line: { color: palette.unusual, width: 1.5, dash: 'dash' } },
    ...flaggedRuns(line.flags).map((run): Partial<Shape> => {
      const { start, end } = runBounds(line, run);
      return { type: 'rect', xref: 'x', yref: 'paper', x0: start, x1: end, y0: 0, y1: 1, fillcolor: palette.unusual, opacity: 0.12, line: { width: 0 }, layer: 'below' };
    }),
    ...(curve.usualBtc === null ? [] : [{ type: 'line', xref: 'x', yref: 'paper', x0: curve.usualBtc, x1: curve.usualBtc, y0: 0, y1: 1, line: { color: palette.reference, width: 1.5, dash: 'dot' } } as Partial<Shape>]),
  ];
  const usualLabel: Array<Partial<Annotations>> = curve.usualBtc === null ? [] : [
    // On a log axis an annotation is placed by the logarithm of the amount, where a shape is placed by the amount itself.
    { xref: 'x', yref: 'paper', x: Math.log10(curve.usualBtc), y: 1, yanchor: 'bottom', showarrow: false, text: 'usual', font: { color: palette.axisInk, size: 12 } },
  ];

  return {
    data: [curveTrace, ...crossTrace, ...markerTrace, ...keys],
    layout: {
      shapes,
      annotations: usualLabel,
      showlegend: true,
      hovermode: 'closest',
      margin: { t: 96 },
      legend: { y: 1.1, tracegroupgap: 4 },
      xaxis: { type: 'log', title: { text: 'Amount (BTC, log scale)' }, tickformat: AMOUNT_FORMAT, ...ticks },
      yaxis: { title: { text: `Score of ${methodName}` }, range: [low - pad, high + pad], ...(compact ? { nticks: 6 } : {}) },
    },
  };
}

export function G5WhatIfResponse({ curve, address, methodId, onMethodChange, marker, onPickAmount }: Props) {
  const { settings } = useSettings();
  const menuId = useId();
  const labels = useMethodLabels();
  const method = curve.methods.find((m) => m.id === methodId) ?? curve.methods[0];
  const methodName = labels[method.id].name;
  const line = useMemo(() => lineOf(method, curve.amountsBtc), [method, curve.amountsBtc]);

  // The form's amount sits on the curve: at E8's exact score once it has answered, else where the curve passes.
  const exact = marker?.answer?.scores[method.id];
  const answer = marker ? (exact ?? scoreAt(line, marker.amountBtc)) : null;
  const flaggedAtMarker = marker ? (marker.answer?.flags[method.id] ?? flagNear(line, marker.amountBtc)) : false;

  const figure = useCallback(
    (context: FigureContext) => buildFigure(line, curve, methodName, marker, answer, flaggedAtMarker, context),
    [line, curve, methodName, marker, answer, flaggedAtMarker],
  );

  const table = useMemo<ChartTable>(
    () => ({
      columns: [{ label: 'Amount (BTC)', numeric: true }, { label: `Score of ${methodName}`, numeric: true }, { label: 'Verdict' }],
      rows: curve.amountsBtc.map((amount, i) => [
        { text: formatBtc(Math.round(amount * SATS_PER_BTC)) },
        { text: method.scores[i] === null ? '—' : method.scores[i]!.toFixed(2) },
        { text: method.flags[i] ? 'Flagged' : 'Not flagged' },
      ]),
    }),
    [curve.amountsBtc, method, methodName],
  );

  const keyboard = useMemo<KeyboardStops>(
    () => ({
      points: curve.amountsBtc.map((amount, i) => ({
        curve: 0,
        point: i,
        label: `${formatBtc(Math.round(amount * SATS_PER_BTC))}: score ${method.scores[i]?.toFixed(2) ?? 'not available'}, ${method.flags[i] ? 'flagged' : 'not flagged'}.`,
      })),
      onOpen: (i) => onPickAmount(curve.amountsBtc[i]),
      instructions: 'Use the left and right arrow keys to move along the amounts, smallest first, and Enter to use one as the amount in the form.',
    }),
    [curve.amountsBtc, method, onPickAmount],
  );

  const reading = describeCurve(line, curve.direction);
  const [first, last] = [curve.amountsBtc[0], curve.amountsBtc[curve.amountsBtc.length - 1]];

  return (
    <div className="g5">
      <div className="g5-method">
        <label htmlFor={menuId}>Method drawn</label>
        <select id={menuId} className="text-input" value={method.id} onChange={(e) => onMethodChange(e.target.value as MethodId)}>
          {curve.methods.map((m) => (
            <option key={m.id} value={m.id}>
              {labels[m.id].name}
              {m.id === curve.decidingMethod ? ' (deciding)' : ''}
            </option>
          ))}
        </select>
      </div>
      <PlotlyChart
        fileName={['what-if-response', address, curve.direction, settings.snapshot?.snapshotDate ?? '']}
        title="How the score changes with the amount"
        caption={`${snapshotCaption(settings.snapshot, address)} · hypothetical amounts, compared with this address's history before ${curve.time.slice(0, 16).replace('T', ' ')} UTC`}
        summary={`Line chart of the ${methodName} score for ${curve.direction === 'out' ? 'sent' : 'received'} amounts from ${formatBtcRounded(first)} to ${formatBtcRounded(last)} on a log scale. ${reading}`}
        hint="Select a point of the curve to use that amount in the form. Drag to zoom, double-click to reset. Yellow triangles are flagged amounts."
        figure={figure}
        table={table}
        revision={`${address}|${curve.direction}|${method.id}`}
        height={400}
        onPointClick={({ curve: trace, point }) => trace === 0 && onPickAmount(curve.amountsBtc[point])}
        keyboard={keyboard}
      />
      <p className="g5-reading" data-testid="curve-reading">
        {reading}
      </p>
    </div>
  );
}
