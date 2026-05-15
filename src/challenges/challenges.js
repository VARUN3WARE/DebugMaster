const shadowStateApp = `
const { useState } = React;

function CounterCard() {
  const [count, setCount] = useState(0);

  const handleQuickAdd = () => {
    setCount(count + 1);
    setCount(count + 1);
  };

  return (
    <div className="stack">
      <h2>Shadow State</h2>
      <p>Quick add should increase by 2.</p>
      <div className="count" data-testid="count">{count}</div>
      <button data-testid="quick-add" onClick={handleQuickAdd}>Quick add +2</button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CounterCard />);
`;

const loopApi = `
const demoUser = { id: 7, name: 'Rhea' };

function fetchUser() {
  if (typeof window.__trackFetch === 'function') {
    window.__trackFetch();
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(demoUser), 250);
  });
}
`;

const loopApp = `
const { useEffect, useState } = React;

function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    setStatus('loading');
    fetchUser().then((data) => {
      setUser(data);
      setStatus('ready');
    });
  }, [user]);

  return (
    <div className="stack">
      <h2>Infinite Loop</h2>
      <p>Stop the silent re-fetch cycle.</p>
      <div className="label">Status: <span data-testid="status">{status}</span></div>
      <div className="label" data-testid="user">{user ? user.name : 'Loading...'}</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`;

const leakWidget = `
const { useEffect, useState } = React;

function Ticker({ label }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((value) => value + 1);
    }, 400);
  }, []);

  return (
    <div className="stack">
      <div className="label">{label}</div>
      <div data-testid="ticker">Tick: {tick}</div>
    </div>
  );
}
`;

const leakApp = `
const { useState } = React;

function App() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="stack">
      <h2>Memory Leak</h2>
      <p>Intervals should stop when the widget unmounts.</p>
      <button data-testid="toggle" onClick={() => setVisible((value) => !value)}>
        {visible ? 'Unmount widget' : 'Mount widget'}
      </button>
      {visible ? <Ticker label="Heartbeat" /> : <div data-testid="empty">Widget removed</div>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`;

export const challenges = [
  {
    id: 'shadow-state',
    level: 'Junior',
    title: 'The Shadow State',
    description:
      'A double update uses stale state. Fix it without changing the UI flow.',
    estimatedMinutes: 8,
    tags: ['React', 'State', 'Batching'],
    objectives: [
      'Make the quick add increment apply twice in one click.',
      'Keep the UI copy and structure unchanged.',
    ],
    tests: [
      {
        id: 'double-increment',
        label: 'Quick add adds 2',
        expectation: 'Count should read 2 after one click.',
      },
    ],
    files: {
      'App.jsx': shadowStateApp,
    },
    entry: 'App.jsx',
    lockedFiles: [],
    hint:
      'The handler performs multiple updates in the same tick. Explain why the second update sees an outdated value.',
  },
  {
    id: 'infinite-loop',
    level: 'Mid',
    title: 'The Infinite Loop',
    description:
      'A data fetch effect keeps re-triggering itself. Make it settle after the first load.',
    estimatedMinutes: 12,
    tags: ['React', 'Effects', 'Fetching'],
    objectives: [
      'Load the user data once on mount.',
      'Prevent self-triggered re-fetch cycles.',
    ],
    tests: [
      {
        id: 'user-loaded',
        label: 'User loads',
        expectation: 'Name appears in the UI.',
      },
      {
        id: 'fetch-threshold',
        label: 'Fetch count stable',
        expectation: 'Fetch count stays under 5.',
      },
    ],
    files: {
      'api.js': loopApi,
      'App.jsx': loopApp,
    },
    entry: 'App.jsx',
    lockedFiles: ['api.js'],
    hint:
      'The effect depends on the same state it updates. Explain the feedback loop rather than the fix.',
  },
  {
    id: 'memory-leak',
    level: 'Senior',
    title: 'The Memory Leak',
    description:
      'An interval keeps running after unmount. Stop the leak without changing behavior.',
    estimatedMinutes: 15,
    tags: ['React', 'Cleanup', 'Intervals'],
    objectives: [
      'Ensure background work stops on unmount.',
      'Keep the ticker behavior intact while mounted.',
    ],
    tests: [
      {
        id: 'interval-cleanup',
        label: 'Interval cleaned',
        expectation: 'No active intervals after unmount.',
      },
    ],
    files: {
      'Widget.jsx': leakWidget,
      'App.jsx': leakApp,
    },
    entry: 'App.jsx',
    lockedFiles: [],
    hint:
      'Intervals survive unmounts unless you tear them down. Explain what lifecycle step is missing.',
  },
];
