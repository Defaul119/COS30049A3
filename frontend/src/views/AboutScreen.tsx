import { PageHeading, useDocumentTitle } from '../components/PageHeading';
import { Icon } from '../components/Icon';
import { useMethodLabels } from '../hooks/useMethods';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { useSettings } from '../hooks/useSettings';
import { formatDay } from '../lib/dates';
import { formatCount, formatList, plural } from '../lib/format';
import { METHODS } from '../lib/methods';
import { settings as bundled } from '../lib/settings';

// V7, about and help (plan section 8): what the Explorer is for and what it does not claim, how to
// read a flag and the charts, the data source and snapshot, the keyboard, and the method. No figure
// is written here: the source, snapshot, flag levels, history rule and features are read from E2 (or,
// without the service, from the bundled settings), so this page cannot disagree with the rest.

const KEYS: Array<{ keys: string; does: string }> = [
  { keys: 'Tab and Shift+Tab', does: 'Move forward and back through the links, buttons and fields in reading order. The first Tab shows "Skip to content".' },
  { keys: 'Enter', does: 'Follow a link or press a button. On a row of the transaction table, Enter opens the transaction.' },
  { keys: 'Space or Enter on a filter chip', does: 'Switch that status or direction on or off.' },
  { keys: 'Left and right arrows on a chart', does: 'Tab to a chart, then move between its days (transactions per day) or its transactions (transactions over time), oldest first. Home and End go to the first and last.' },
  { keys: 'Enter or Space on a chart', does: 'Open the day or the transaction the arrow keys have reached.' },
];

export function AboutScreen() {
  useDocumentTitle('About and help');
  const { settings } = useSettings();
  const { health } = useServiceStatus();
  const { snapshot, thresholds, features, history } = settings;
  const deciding = snapshot?.method;
  const labels = useMethodLabels();

  return (
    <div className="page page-about">
      <header className="page-head">
        <PageHeading>About and help</PageHeading>
        <p className="lede">
          The Bitcoin Address Activity Explorer shows how a Bitcoin address has been used, day by day, and marks the transactions that
          are unusual compared with that same address's own earlier activity. For each one it says what stands out, and by how much.
        </p>
      </header>

      <section className="card prose" aria-labelledby="claims-title">
        <h2 id="claims-title">What it does not claim</h2>
        <p className="limitation">
          <Icon name="info" />
          <span>{settings.limitationLine}</span>
        </p>
        <ul>
          <li>A flag is a reason to look closer. It is not a finding, and it says nothing about who is behind an address or why a payment was made.</li>
          <li>
            An address is compared only with its own past, never with other addresses.
            {snapshot ? ` The Explorer covers the ${plural(snapshot.addressCount, 'address', 'addresses')} in its snapshot, and no others.` : ''}
          </li>
          <li>Real transactions carry no labels saying which ones matter, so no accuracy is claimed for the flags on them.</li>
        </ul>
      </section>

      <section className="card prose" aria-labelledby="data-title">
        <h2 id="data-title">Where the data comes from</h2>
        {snapshot ? (
          <dl className="facts about-facts">
            <div className="fact">
              <dt>Source</dt>
              <dd>
                <a href={snapshot.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {snapshot.source} <Icon name="external" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
            <div className="fact">
              <dt>Snapshot</dt>
              <dd>{formatDay(snapshot.snapshotDate)}</dd>
            </div>
            <div className="fact">
              <dt>Addresses</dt>
              <dd>{formatCount(snapshot.addressCount)}</dd>
            </div>
            <div className="fact">
              <dt>Days and times</dt>
              <dd>{snapshot.dayTimeZone}</dd>
            </div>
          </dl>
        ) : (
          <p>
            The data comes from {bundled.source.name}. The snapshot date and the number of addresses are shown here once the explorer service
            answers.
          </p>
        )}
        {snapshot?.illustrative ? <p className="muted">This snapshot is illustrative: the transactions are examples, not a record of real activity.</p> : null}
        <p>Everything on the Explorer is public blockchain data. A snapshot is fixed, so a page shows the same numbers every time it is opened.</p>
      </section>

      <section className="card prose" aria-labelledby="unusual-title">
        <h2 id="unusual-title">What "unusual" means</h2>
        <p>
          A transaction is <strong>unusual</strong> when it differs from the same address's own earlier transactions by more than the flag
          level{thresholds ? ` (${thresholds.flagAbsZ})` : ''}. It is then flagged: worth a look, and nothing more. Each transaction has one of three statuses.
        </p>
        <ul>
          <li>
            <strong>Unusual</strong>: flagged, with the strongest reason beside it, such as a longer gap than usual.
          </li>
          <li>
            <strong>Not unusual</strong>: scored, and not far enough from the address's usual pattern to be flagged.
          </li>
          <li>
            <strong>Not scored</strong>: the address had too little earlier history to compare with. Scoring needs at least {history.minTx} earlier transactions over at
            least {history.minSpanDays} days.
          </li>
        </ul>
        {features.length > 0 ? (
          <>
            <p>The comparison looks at {plural(features.length, 'feature')}:</p>
            <dl className="about-features">
              {features.map((f) => (
                <div key={f.id}>
                  <dt>{f.name}</dt>
                  <dd>{f.description}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </section>

      <section className="card prose" aria-labelledby="charts-title">
        <h2 id="charts-title">How to read the charts</h2>
        <ul>
          <li>
            <strong>Transactions per day.</strong> One bar for each day with activity, so gaps are quiet stretches. A day with an unusual
            transaction is yellow with a triangle above it. Select a bar to open that day.
          </li>
          <li>
            <strong>Transactions over time.</strong> One point for each transaction: time across, amount up on a log scale, where each step up
            is ten times larger. A filled mark was received and an outlined mark was sent. Unusual transactions are yellow triangles and not-scored ones are grey
            diamonds. A bigger mark has a higher score. Drag across the time axis to zoom, which also sets the dates in the filter bar. Select a point to open that transaction.
          </li>
          <li>
            <strong>How this transaction compares with usual.</strong> One bar for each feature, showing how far this transaction is from the
            address's usual value. Bars to the right are above usual and bars to the left are below. The dashed lines mark the flag level
            {thresholds ? `, ${thresholds.flagAbsZ} either way` : ''}, and the shaded band is the range that does not stand out
            {thresholds ? ` (within ${thresholds.contributingAbsZ})` : ''}.
          </li>
          <li>Every chart has a "View as table" switch, or a table under it, with the same numbers, and a "Download PNG" button.</li>
        </ul>
      </section>

      <section className="card prose" aria-labelledby="keys-title">
        <h2 id="keys-title">Keyboard</h2>
        <dl className="key-list">
          {KEYS.map((k) => (
            <div key={k.keys}>
              <dt>{k.keys}</dt>
              <dd>{k.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card prose" aria-labelledby="method-title">
        <h2 id="method-title">The method in one paragraph</h2>
        <p>
          Each transaction is compared only with the transactions the same address confirmed strictly before it, so a score never uses the
          future. {features.length > 0 ? `${formatList(features.map((f) => f.name))} are measured` : 'Its size, pace and gap are measured'} and each is turned into a
          robust z-score: how far the value is from the address's median, in units of that address's own usual spread.
          {thresholds
            ? ` A transaction is flagged when a score reaches ${thresholds.flagAbsZ} in either direction, and a feature counts as contributing from ${thresholds.contributingAbsZ}.`
            : ''}
          {deciding ? ` ${labels[deciding.id].name} decides which transactions are flagged.` : ''} Alongside it, {METHODS.length - 1} further methods score every transaction on their
          own scales and are shown beside it for comparison.
        </p>
        {health ? <p className="muted">Explorer service version {health.version}.</p> : null}
      </section>
    </div>
  );
}
