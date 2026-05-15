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

const pipelineService = `
function getRawData() {
  return new Promise((resolve) => {
    // API returns 'uid' instead of 'id'
    setTimeout(() => resolve({ uid: 101, name: 'Cascade' }), 100);
  });
}
`;

const pipelineAdapter = `
function transform(raw) {
  // Bug: Accessing .id instead of .uid from the raw response
  return {
    id: raw.id, 
    label: raw.name
  };
}
`;

const pipelineApp = `
const { useEffect, useState } = React;

function App() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    getRawData()
      .then(transform)
      .then(setItem);
  }, []);

  if (!item) return <div>Loading...</div>;

  return (
    <div className="stack">
      <h2>Broken Pipeline</h2>
      <p>Fix the contract between files.</p>
      <div className="label" data-testid="result">
        {item.id ? \`ID: \${item.id} - \${item.label}\` : 'Invalid Data'}
      </div>
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
    seniorInsight: 'A senior developer avoids relying on closure state when multiple updates are batched. Functional updates ensure each step works with the latest value.',
    seniorSolution: `  const handleQuickAdd = () => {
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
  };`
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
    seniorInsight: 'Correct dependency management is the difference between a stable app and a crash. Effects should only run when their external dependencies change, not as a reaction to their own results.',
    seniorSolution: `  useEffect(() => {
    setStatus('loading');
    fetchUser().then((data) => {
      setUser(data);
      setStatus('ready');
    });
  }, []);`
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
    seniorInsight: 'Shipping ability means shipping clean memory. A senior engineer always considers the cleanup phase of any side effect to prevent resource exhaustion.',
    seniorSolution: `  useEffect(() => {
    const id = setInterval(() => {
      setTick((value) => value + 1);
    }, 400);
    return () => clearInterval(id);
  }, []);`
  },
  {
    id: 'broken-pipeline',
    level: 'Senior',
    title: 'The Broken Pipeline',
    description:
      'A multi-file data pipeline is failing. Trace the contract break across the service and the adapter.',
    estimatedMinutes: 18,
    tags: ['Architecture', 'Contracts', 'Pipelines'],
    objectives: [
      'Ensure the final UI renders the correct ID and Label.',
      'Identify which file in the sequence contains the schema mismatch.',
    ],
    tests: [
      {
        id: 'pipeline-contract',
        label: 'Contract valid',
        expectation: 'Result contains ID: 101 - Cascade.',
      },
    ],
    files: {
      'service.js': pipelineService,
      'adapter.js': pipelineAdapter,
      'App.jsx': pipelineApp,
    },
    entry: 'App.jsx',
    lockedFiles: ['service.js'],
    hint:
      'The service returns a payload with a different key than the adapter expects. Senior fix: update the adapter to match the new service contract.',
    seniorInsight: 'In large systems, bugs often live in the "glue" between files. A senior developer traces the data flow from the source to the sink to find where the contract was broken.',
    seniorSolution: `function transform(raw) {
  return {
    id: raw.uid, 
    label: raw.name
  };
}`
  },
];
