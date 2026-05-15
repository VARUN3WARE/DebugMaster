import { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  CheckCircle2,
  Flame,
  GitBranch,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react';
import CodeEditor from './components/Editor';
import Runner from './components/Runner';
import { challenges } from './challenges/challenges';
import { requestHint } from './lib/hintClient';
import { loadProgress, recordHistoryEntry, saveProgress } from './lib/progress';

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const calculateScore = (seconds, logs) => {
  return Math.max(0, 1000 - seconds * 4 - logs * 20);
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

const resultBadge = (status) => {
  switch (status) {
    case 'pass':
      return 'border-sea-500/40 bg-sea-500/15 text-sea-500';
    case 'fail':
      return 'border-ember-500/40 bg-ember-400/15 text-ember-500';
    case 'running':
      return 'border-ink-800/20 bg-white/70 text-ink-600';
    default:
      return 'border-sand-200 bg-white/70 text-ink-600';
  }
};

const caseBadge = (status) => {
  switch (status) {
    case 'pass':
      return 'bg-sea-500/15 text-sea-500';
    case 'fail':
      return 'bg-ember-400/15 text-ember-500';
    case 'running':
      return 'bg-ink-800/10 text-ink-600';
    default:
      return 'bg-sand-200 text-ink-600';
  }
};

const buildCaseResults = (tests = []) => {
  return tests.reduce((accumulator, test) => {
    accumulator[test.id] = { status: 'idle', message: '' };
    return accumulator;
  }, {});
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
  const [activeTab, setActiveTab] = useState('preview');
  const [runKey, setRunKey] = useState(Date.now());
  const [runId, setRunId] = useState(String(Date.now()));
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
  const [caseResults, setCaseResults] = useState(
    buildCaseResults(challenges[0].tests),
  );
  const [runMeta, setRunMeta] = useState({
    mode: 'run',
    startedAt: null,
  });
  const [progress, setProgress] = useState(loadProgress);
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
  const activeTests = activeChallenge?.tests ?? [];
  const activeHistory = progress?.history?.[activeChallengeId] ?? [];
  const isReadOnly = activeChallenge?.lockedFiles?.includes(activeFile) ?? false;

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
    setRunId(String(Date.now()));
    setCaseResults(buildCaseResults(activeChallenge?.tests));
    setHintState({
      status: 'idle',
      message: 'Hints explain the bug, not the fix.',
    });
    setActiveTab('preview');
  }, [activeChallengeId, activeChallenge]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('senioritytrap_api_key', apiKey);
    } else {
      localStorage.removeItem('senioritytrap_api_key');
    }
  }, [apiKey]);

  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
  const score = calculateScore(elapsedSeconds, stats.logCount);

  const handleCodeChange = (value) => {
    setCodeByChallenge((previous) => ({
      ...previous,
      [activeChallengeId]: {
        ...previous[activeChallengeId],
        [activeFile]: value,
      },
    }));
  };

  const handleRun = (mode = 'run') => {
    setRunMeta({ mode, startedAt: Date.now() });
    setTestResult({ status: 'running', message: 'Running tests...' });
    setStats({ logCount: 0, fetchCount: 0, intervalCount: 0 });
    setLogs([]);
    setCaseResults((previous) => {
      const next = { ...previous };
      activeTests.forEach((test) => {
        next[test.id] = { status: 'running', message: '' };
      });
      return next;
    });
    setRunKey(Date.now());
    setRunId(String(Date.now()));
  };

  const handleReset = () => {
    if (!activeChallenge) {
      return;
    }

    setCodeByChallenge((previous) => ({
      ...previous,
      [activeChallengeId]: { ...activeChallenge.files },
    }));
    setStartTime(Date.now());
    setTestResult({
      status: 'idle',
      message: 'Run the tests to validate your fix.',
    });
    setStats({ logCount: 0, fetchCount: 0, intervalCount: 0 });
    setLogs([]);
    setCaseResults(buildCaseResults(activeChallenge.tests));
    setHintState({
      status: 'idle',
      message: 'Hints explain the bug, not the fix.',
    });
    setRunKey(Date.now());
    setRunId(String(Date.now()));
  };

  const handleSandboxEvent = (event) => {
    if (event.runId && String(event.runId) !== runId) {
      return;
    }

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

    if (event.type === 'case') {
      const { id, status, message } = event.payload || {};
      if (!id) {
        return;
      }
      setCaseResults((previous) => ({
        ...previous,
        [id]: { status, message: message || '' },
      }));
      return;
    }

    if (event.type === 'test') {
      setTestResult({
        status: event.payload.status,
        message: event.payload.message,
      });

      const historyEntry = {
        status: event.payload.status,
        message: event.payload.message,
        score,
        logs: stats.logCount,
        duration: elapsedSeconds,
        mode: runMeta.mode,
        timestamp: new Date().toISOString(),
      };

      setProgress((previous) => {
        let next = recordHistoryEntry(
          previous,
          activeChallengeId,
          historyEntry,
        );

        if (event.payload.status === 'pass') {
          next = {
            ...next,
            passes: {
              ...next.passes,
              [activeChallengeId]: true,
            },
          };
        }

        return next;
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

  const handleClearHistory = () => {
    setProgress((previous) => ({
      passes: previous.passes,
      history: {
        ...previous.history,
        [activeChallengeId]: [],
      },
    }));
  };

  return (
    <div className="min-h-screen text-ink-900">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 pb-4 pt-8">
        <div className="flex flex-wrap items-center gap-6">
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
          <nav className="hidden items-center gap-2 text-sm font-medium text-ink-600 lg:flex">
            <span className="rounded-full border border-ink-900/10 bg-white/70 px-3 py-1 text-ink-900">
              Problems
            </span>
            <span className="rounded-full border border-sand-200 bg-white/70 px-3 py-1">
              Sandbox
            </span>
            <span className="rounded-full border border-sand-200 bg-white/70 px-3 py-1">
              Submissions
            </span>
          </nav>
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

      <main className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[260px_minmax(0,1fr)_360px] animate-rise">
        <aside className="panel flex flex-col gap-6 p-5">
          <div>
            <div className="panel-title">Challenges</div>
            <div className="mt-4 flex flex-col gap-3">
              {challenges.map((challenge) => {
                const isActive = challenge.id === activeChallengeId;
                const isComplete = progress?.passes?.[challenge.id];

                return (
                  <button
                    key={challenge.id}
                    type="button"
                    onClick={() => setActiveChallengeId(challenge.id)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition hover:border-ink-800/40 hover:bg-white ${
                      isActive
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
                    <div className="flex items-center justify-between text-[11px] text-ink-500">
                      <span>{challenge.estimatedMinutes} min</span>
                      {isComplete ? (
                        <span className="flex items-center gap-1 text-sea-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Cleared
                        </span>
                      ) : (
                        <span className="text-ink-400">Not cleared</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="panel-title">Files</div>
            <div className="mt-3 flex flex-col gap-2">
              {Object.keys(activeFiles || {}).map((file) => {
                const isLocked = activeChallenge?.lockedFiles?.includes(file);
                return (
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
                    {isLocked ? (
                      <Lock className="h-4 w-4 opacity-60" />
                    ) : (
                      <GitBranch className="h-4 w-4 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
            {activeChallenge?.lockedFiles?.length ? (
              <p className="mt-3 text-xs text-ink-500">
                <Lock className="mr-1 inline h-3 w-3" />
                Some files are locked to keep the focus tight.
              </p>
            ) : null}
          </div>
        </aside>

        <section className="panel flex h-[680px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-600">
                Editor
              </p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{activeFile}</span>
                {isReadOnly ? (
                  <span className="rounded-full border border-ink-900/10 bg-sand-100 px-2 py-0.5 text-[10px] text-ink-600">
                    Read-only
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRun('run')}
                className="flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-sand-50 transition hover:bg-ink-800"
              >
                <Play className="h-4 w-4" />
                Run
              </button>
              <button
                type="button"
                onClick={() => handleRun('submit')}
                className="flex items-center gap-2 rounded-full border border-ink-900/80 bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-sand-100"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-2 text-sm text-ink-600 transition hover:border-ink-800/30"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
          <div className="flex-1">
            <CodeEditor
              value={activeCode}
              onChange={handleCodeChange}
              readOnly={isReadOnly}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="panel-title">Problem</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {activeChallenge?.title}
                </h2>
                <p className="mt-2 text-sm text-ink-600">
                  {activeChallenge?.description}
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${levelBadge(
                  activeChallenge?.level,
                )}`}
              >
                {activeChallenge?.level}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="pill">{activeChallenge?.estimatedMinutes} min</span>
              {(activeChallenge?.tags || []).map((tag) => (
                <span key={tag} className="pill">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-600">
                Objectives
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                {(activeChallenge?.objectives || []).map((objective) => (
                  <li key={objective} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ember-400" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel flex h-[360px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                {[
                  { id: 'preview', label: 'Preview' },
                  { id: 'tests', label: 'Tests' },
                  { id: 'hint', label: 'Hint' },
                  { id: 'console', label: 'Console' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      activeTab === tab.id
                        ? 'border-ink-800/40 bg-white text-ink-900'
                        : 'border-sand-200 bg-white/60 text-ink-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="pill">Sandbox</span>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'preview' ? (
                <div className="h-full p-3">
                  <Runner
                    files={activeFiles}
                    entryFile={activeChallenge?.entry}
                    challengeId={activeChallenge?.id}
                    runKey={runKey}
                    runId={runId}
                    onEvent={handleSandboxEvent}
                  />
                </div>
              ) : null}

              {activeTab === 'tests' ? (
                <div className="flex h-full flex-col gap-3 p-4 text-sm text-ink-700">
                  <div className="flex items-center justify-between">
                    <p className="panel-title">Validation</p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${resultBadge(
                        testResult.status,
                      )}`}
                    >
                      {testResult.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink-700">{testResult.message}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-ink-600">
                    <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                      <p className="font-semibold text-ink-900">
                        {stats.fetchCount}
                      </p>
                      <p>fetches</p>
                    </div>
                    <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                      <p className="font-semibold text-ink-900">
                        {stats.intervalCount}
                      </p>
                      <p>intervals</p>
                    </div>
                    <div className="rounded-xl border border-sand-200 bg-white/70 p-2">
                      <p className="font-semibold text-ink-900">
                        {stats.logCount}
                      </p>
                      <p>logs</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {activeTests.map((test) => {
                      const current = caseResults[test.id] || {
                        status: 'idle',
                        message: '',
                      };

                      return (
                        <div
                          key={test.id}
                          className="rounded-xl border border-sand-200 bg-white/70 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-ink-900">
                              {test.label}
                            </p>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${caseBadge(
                                current.status,
                              )}`}
                            >
                              {current.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-600">
                            {current.message || test.expectation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeTab === 'hint' ? (
                <div className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="panel-title">AI Hint</p>
                    <Sparkles className="h-4 w-4 text-ember-500" />
                  </div>
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
                    className="flex items-center justify-center gap-2 rounded-xl border border-ink-900/80 bg-ink-900 px-3 py-2 text-sm font-semibold text-sand-50 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Sparkles className="h-4 w-4" />
                    Get hint
                  </button>
                  <p
                    className={`text-sm ${
                      hintState.status === 'error'
                        ? 'text-ember-500'
                        : 'text-ink-600'
                    }`}
                  >
                    {hintState.message}
                  </p>
                </div>
              ) : null}

              {activeTab === 'console' ? (
                <div className="flex h-full flex-col gap-2 p-4 text-xs text-ink-600">
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
              ) : null}
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="panel-title">Run history</p>
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-ink-500 underline-offset-4 hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs text-ink-600">
              {activeHistory.length === 0 ? (
                <p>No submissions yet. Hit Submit to log a run.</p>
              ) : (
                activeHistory.map((entry, index) => (
                  <div
                    key={`history-${index}`}
                    className="rounded-xl border border-sand-200 bg-white/70 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase text-ink-500">
                        {entry.mode}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${resultBadge(
                          entry.status,
                        )}`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-900">
                      {entry.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
                      <span>{entry.duration}s</span>
                      <span>Score {entry.score}</span>
                    </div>
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
