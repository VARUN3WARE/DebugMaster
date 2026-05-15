import { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Flame,
  GitBranch,
  Play,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react';
import CodeEditor from './components/Editor';
import Runner from './components/Runner';
import { challenges } from './challenges/challenges';
import { requestHint } from './lib/hintClient';

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const levelBadge = (level) => {
  switch (level) {
    case 'Junior':
      return 'bg-sea-500/15 text-sea-500 border-sea-500/30';
    case 'Mid':
      return 'bg-ember-400/15 text-ember-500 border-ember-400/30';
    case 'Senior':
      return 'bg-ink-800/10 text-ink-800 border-ink-800/20';
    default:
      return 'bg-sand-200 text-ink-700 border-sand-200';
  }
};

const App = () => {
  const [activeChallengeId, setActiveChallengeId] = useState(challenges[0].id);
  const [codeByChallenge, setCodeByChallenge] = useState(() => {
    return challenges.reduce((accumulator, challenge) => {
      accumulator[challenge.id] = { ...challenge.files };
      return accumulator;
    }, {});
  });
  const [activeFile, setActiveFile] = useState(challenges[0].entry);
  const [runKey, setRunKey] = useState(Date.now());
  const [startTime, setStartTime] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    logCount: 0,
    fetchCount: 0,
    intervalCount: 0,
  });
  const [testResult, setTestResult] = useState({
    status: 'idle',
    message: 'Run the tests to validate your fix.',
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('senioritytrap_api_key') ?? '';
  });
  const [hintState, setHintState] = useState({
    status: 'idle',
    message: 'Hints explain the bug, not the fix.',
  });

  const activeChallenge = challenges.find(
    (challenge) => challenge.id === activeChallengeId,
  );
  const activeFiles = codeByChallenge[activeChallengeId];
  const activeCode = activeFiles?.[activeFile] ?? '';

  const combinedCodeForHint = useMemo(() => {
    const files = activeFiles || {};
    return Object.keys(files)
      .map((file) => `// File: ${file}\n${files[file]}`)
      .join('\n\n');
  }, [activeFiles]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeChallenge?.entry) {
      setActiveFile(activeChallenge.entry);
    }
    setStartTime(Date.now());
    setTestResult({
      status: 'idle',
      message: 'Run the tests to validate your fix.',
    });
    setStats({ logCount: 0, fetchCount: 0, intervalCount: 0 });
    setLogs([]);
    setRunKey(Date.now());
  }, [activeChallengeId, activeChallenge]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('senioritytrap_api_key', apiKey);
    } else {
      localStorage.removeItem('senioritytrap_api_key');
    }
  }, [apiKey]);

  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
  const score = Math.max(0, 1000 - elapsedSeconds * 4 - stats.logCount * 20);

  const handleCodeChange = (value) => {
    setCodeByChallenge((previous) => ({
      ...previous,
      [activeChallengeId]: {
        ...previous[activeChallengeId],
        [activeFile]: value,
      },
    }));
  };

  const handleRun = () => {
    setTestResult({ status: 'running', message: 'Running tests...' });
    setStats({ logCount: 0, fetchCount: 0, intervalCount: 0 });
    setLogs([]);
    setStartTime(Date.now());
    setRunKey(Date.now());
  };

  const handleSandboxEvent = (event) => {
    if (event.type === 'log') {
      setLogs(event.payload.logs.slice(-6));
      setStats((previous) => ({
        ...previous,
        logCount: event.payload.logCount,
      }));
      return;
    }

    if (event.type === 'stats') {
      setStats({
        logCount: event.payload.logCount ?? 0,
        fetchCount: event.payload.fetchCount ?? 0,
        intervalCount: event.payload.intervalCount ?? 0,
      });
      return;
    }

    if (event.type === 'test') {
      setTestResult({
        status: event.payload.status,
        message: event.payload.message,
      });
    }
  };

  const handleHint = async () => {
    if (!activeChallenge) {
      return;
    }

    if (!apiKey) {
      setHintState({
        status: 'error',
        message: 'Add an API key to request a hint.',
      });
      return;
    }

    setHintState({ status: 'loading', message: 'Contacting mentor...' });

    try {
      const hint = await requestHint({
        apiKey,
        challenge: activeChallenge,
        code: combinedCodeForHint,
      });
      setHintState({ status: 'ready', message: hint });
    } catch (error) {
      setHintState({
        status: 'error',
        message: error.message || 'Failed to load hint.',
      });
    }
  };

  return (
    <div className="min-h-screen text-ink-900">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 pb-4 pt-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-ink-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900 text-sand-50">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                SeniorityTrap
              </h1>
              <p className="text-sm text-ink-600">
                Debug-first drills for signal, not noise.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="pill flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>
          <div className="pill flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>Score {score}</span>
          </div>
          <div className="pill flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <span>{stats.logCount} logs</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="panel flex flex-col gap-6 p-5">
          <div>
            <div className="panel-title">Challenges</div>
            <div className="mt-4 flex flex-col gap-3">
              {challenges.map((challenge) => (
                <button
                  key={challenge.id}
                  type="button"
                  onClick={() => setActiveChallengeId(challenge.id)}
                  className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition hover:border-ink-800/40 hover:bg-white ${
                    challenge.id === activeChallengeId
                      ? 'border-ink-800/50 bg-white shadow-glow'
                      : 'border-sand-200 bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">
                      {challenge.title}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${levelBadge(
                        challenge.level,
                      )}`}
                    >
                      {challenge.level}
                    </span>
                  </div>
                  <p className="text-xs text-ink-600">
                    {challenge.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="panel-title">Files</div>
            <div className="mt-3 flex flex-col gap-2">
              {Object.keys(activeFiles || {}).map((file) => (
                <button
                  key={file}
                  type="button"
                  onClick={() => setActiveFile(file)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                    file === activeFile
                      ? 'border-ink-800/40 bg-white text-ink-900'
                      : 'border-sand-200 bg-white/60 text-ink-600'
                  }`}
                >
                  <span>{file}</span>
                  <GitBranch className="h-4 w-4 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel flex h-[620px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-600">
                Editor
              </p>
              <p className="text-sm font-semibold">{activeFile}</p>
            </div>
            <button
              type="button"
              onClick={handleRun}
              className="flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-sand-50 transition hover:bg-ink-800"
            >
              <Play className="h-4 w-4" />
              Run tests
            </button>
          </div>
          <div className="flex-1">
            <CodeEditor value={activeCode} onChange={handleCodeChange} />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="panel flex h-[320px] flex-col overflow-hidden p-4">
            <div className="flex items-center justify-between">
              <p className="panel-title">Live Preview</p>
              <span className="pill">Sandboxed iframe</span>
            </div>
            <div className="mt-3 flex-1 overflow-hidden">
              <Runner
                files={activeFiles}
                entryFile={activeChallenge?.entry}
                challengeId={activeChallenge?.id}
                runKey={runKey}
                onEvent={handleSandboxEvent}
              />
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="panel-title">Validation</p>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  testResult.status === 'pass'
                    ? 'border-sea-500/40 bg-sea-500/15 text-sea-500'
                    : testResult.status === 'fail'
                      ? 'border-ember-500/40 bg-ember-400/15 text-ember-500'
                      : 'border-sand-200 bg-white/70 text-ink-600'
                }`}
              >
                {testResult.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-700">{testResult.message}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-ink-600">
              <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                <p className="font-semibold text-ink-900">{stats.fetchCount}</p>
                <p>fetches</p>
              </div>
              <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                <p className="font-semibold text-ink-900">{stats.intervalCount}</p>
                <p>intervals</p>
              </div>
              <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                <p className="font-semibold text-ink-900">{stats.logCount}</p>
                <p>logs</p>
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="panel-title">AI Hint</p>
              <Sparkles className="h-4 w-4 text-ember-500" />
            </div>
            <div className="mt-3 space-y-3">
              <input
                type="password"
                placeholder="API key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="w-full rounded-xl border border-sand-200 bg-white/70 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleHint}
                disabled={hintState.status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-900/80 bg-ink-900 px-3 py-2 text-sm font-semibold text-sand-50 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles className="h-4 w-4" />
                Get hint
              </button>
              <p
                className={`text-sm ${
                  hintState.status === 'error' ? 'text-ember-500' : 'text-ink-600'
                }`}
              >
                {hintState.message}
              </p>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="panel-title">Console</p>
              <span className="pill">last 6</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-ink-600">
              {logs.length === 0 ? (
                <p>No logs yet. Keep it lean for a higher score.</p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={`log-${index}`}
                    className="rounded-lg border border-sand-200 bg-white/70 px-2 py-1 font-mono"
                  >
                    {log.join(' ')}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
