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

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Unknown';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
};

const App = () => {
  const [activeView, setActiveView] = useState('home');
  const [levelFilter, setLevelFilter] = useState('All');
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [score, setScore] = useState(0);
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

  const bestScores = useMemo(() => {
    const output = {};
    challenges.forEach((challenge) => {
      const history = progress?.history?.[challenge.id] || [];
      output[challenge.id] = history.reduce(
        (best, entry) => Math.max(best, entry.score || 0),
        0,
      );
    });
    return output;
  }, [progress]);

  const totalSolved = Object.values(progress?.passes || {}).filter(Boolean)
    .length;
  const totalAttempts = Object.values(progress?.history || {}).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );

  const allHistory = useMemo(() => {
    const entries = [];
    Object.entries(progress?.history || {}).forEach(([challengeId, history]) => {
      const challenge = challenges.find((item) => item.id === challengeId);
      history.forEach((entry) => {
        entries.push({
          ...entry,
          challengeId,
          challengeTitle: challenge?.title || challengeId,
          level: challenge?.level || 'Unknown',
        });
      });
    });

    return entries.sort((a, b) => {
      const left = new Date(a.timestamp || 0).getTime();
      const right = new Date(b.timestamp || 0).getTime();
      return right - left;
    });
  }, [progress]);

  const filteredChallenges = challenges.filter((challenge) => {
    if (levelFilter === 'All') {
      return true;
    }
    return challenge.level === levelFilter;
  });

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [timerRunning, startTime]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }
    setScore(calculateScore(elapsedSeconds, stats.logCount));
  }, [timerRunning, elapsedSeconds, stats.logCount]);

  useEffect(() => {
    if (activeChallenge?.entry) {
      setActiveFile(activeChallenge.entry);
    }
    setElapsedSeconds(0);
    setTimerRunning(false);
    setScore(0);
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
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setTimerRunning(true);
    setScore(calculateScore(0, 0));
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
    setActiveTab('tests');
  };

  const handleReset = () => {
    if (!activeChallenge) {
      return;
    }

    setCodeByChallenge((previous) => ({
      ...previous,
      [activeChallengeId]: { ...activeChallenge.files },
    }));
    setElapsedSeconds(0);
    setTimerRunning(false);
    setScore(0);
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
    setActiveTab('preview');
  };

  const handleSandboxEvent = (event) => {
    if (event.runId && String(event.runId) !== runId) {
      return;
    }

    if (event.type === 'log') {
      if (!timerRunning) {
        return;
      }
      setLogs(event.payload.logs.slice(-6));
      setStats((previous) => ({
        ...previous,
        logCount: event.payload.logCount,
      }));
      return;
    }

    if (event.type === 'stats') {
      if (!timerRunning) {
        return;
      }
      setStats({
        logCount: event.payload.logCount ?? 0,
        fetchCount: event.payload.fetchCount ?? 0,
        intervalCount: event.payload.intervalCount ?? 0,
      });
      return;
    }

    if (event.type === 'case') {
      if (!timerRunning) {
        return;
      }
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
      const duration = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const finalScore = calculateScore(duration, stats.logCount);
      setElapsedSeconds(duration);
      setTimerRunning(false);
      setScore(finalScore);
      setTestResult({
        status: event.payload.status,
        message: event.payload.message,
      });

      const historyEntry = {
        status: event.payload.status,
        message: event.payload.message,
        score: finalScore,
        logs: stats.logCount,
        duration,
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

  const handleClearAllHistory = () => {
    setProgress({ passes: {}, history: {} });
  };

  const handleOpenChallenge = (challengeId) => {
    setActiveChallengeId(challengeId);
    setActiveView('sandbox');
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-ink-900 selection:bg-ember-400/20">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white shadow-sm">
                <Bug className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-ink-900">
                DebugMaster
              </span>
            </button>

            <nav className="hidden items-center gap-1 lg:flex">
              {[
                { id: 'home', label: 'Home' },
                { id: 'problems', label: 'Problems' },
                { id: 'sandbox', label: 'Sandbox' },
                { id: 'submissions', label: 'Submissions' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`px-4 py-1 text-sm font-medium transition-colors ${
                    activeView === item.id
                      ? 'text-ink-900'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-600">
              <Timer className="h-3.5 w-3.5 text-ink-400" />
              <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-1.5 text-xs font-semibold text-ink-600">
              <Trophy className="h-3.5 w-3.5 text-ember-500" />
              <span>{score} pts</span>
            </div>
            <div className="h-4 w-px bg-black/[0.06]" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-200 text-ink-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-12 animate-rise">
        {activeView === 'home' ? (
          <section className="flex flex-col gap-8 py-8">
            <div className="panel flex flex-col items-center justify-center gap-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03] text-ink-900 ring-1 ring-black/[0.06]">
                <Bug className="h-6 w-6" />
              </div>
              <div className="max-w-2xl px-6">
                <h2 className="text-4xl font-bold tracking-tight text-ink-900 lg:text-5xl">
                  Level up your debugging instincts.
                </h2>
                <p className="mt-4 text-base text-ink-500 lg:text-lg">
                  Real-world bugs, high-pressure scenarios, and professional grading. 
                  DebugMaster helps you ship faster with fewer logs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('problems')}
                  className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Training
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('sandbox')}
                  className="rounded-lg border border-black/10 bg-white px-6 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-black/[0.02]"
                >
                  Open Sandbox
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: 'Solved', value: `${totalSolved}/${challenges.length}`, icon: CheckCircle2 },
                { label: 'Attempts', value: totalAttempts, icon: Flame },
                { label: 'Best Score', value: Math.max(0, ...Object.values(bestScores)), icon: Trophy },
              ].map((stat, i) => (
                <div key={i} className="panel flex items-center gap-4 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-ink-600">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{stat.label}</p>
                    <p className="text-xl font-bold text-ink-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeView === 'problems' ? (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-bold text-ink-900">Problem Set</h2>
                <p className="text-xs text-ink-500">Pick a bug and start squashing.</p>
              </div>
              <div className="flex items-center gap-1">
                {['All', 'Junior', 'Mid', 'Senior'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevelFilter(level)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                      levelFilter === level
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-500 hover:bg-black/5 hover:text-ink-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_100px] border-b border-black/[0.04] bg-black/[0.01] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                <span>Title</span>
                <span>Level</span>
                <span>Score</span>
                <span className="text-right">Action</span>
              </div>
              <div className="flex flex-col divide-y divide-black/[0.04]">
                {filteredChallenges.map((challenge) => {
                  const isComplete = progress?.passes?.[challenge.id];
                  const bestScore = bestScores[challenge.id] || 0;

                  return (
                    <div
                      key={challenge.id}
                      className="group grid grid-cols-[1fr_120px_120px_100px] items-center px-6 py-4 transition-colors hover:bg-black/[0.01]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink-900 group-hover:text-ink-800">
                            {challenge.title}
                          </span>
                          {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-sea-500" />}
                        </div>
                        <p className="text-[11px] text-ink-500">{challenge.description}</p>
                      </div>
                      <div className="flex items-center">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${levelBadge(challenge.level)}`}>
                          {challenge.level}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-semibold text-ink-600">{bestScore} pts</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenChallenge(challenge.id)}
                          className="rounded-md bg-black/5 px-3 py-1.5 text-[10px] font-bold text-ink-700 transition-colors hover:bg-ink-900 hover:text-white"
                        >
                          SOLVE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeView === 'submissions' ? (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-bold text-ink-900">Submission Ledger</h2>
                <p className="text-xs text-ink-500">History of all your debugging attempts.</p>
              </div>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="rounded-md border border-black/10 px-3 py-1.5 text-[10px] font-bold text-ink-500 transition-colors hover:bg-black/5 hover:text-ink-700 uppercase"
              >
                Clear All
              </button>
            </div>

            <div className="panel overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_100px_100px_100px_140px] border-b border-black/[0.04] bg-black/[0.01] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                <span>Problem</span>
                <span>Status</span>
                <span>Mode</span>
                <span>Time</span>
                <span>Score</span>
                <span className="text-right">Timestamp</span>
              </div>
              <div className="flex flex-col divide-y divide-black/[0.04]">
                {allHistory.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-ink-400 italic">No runs recorded yet.</div>
                ) : (
                  allHistory.map((entry, index) => (
                    <div
                      key={`submission-${index}`}
                      className="grid grid-cols-[1fr_120px_100px_100px_100px_140px] items-center px-6 py-3.5 transition-colors hover:bg-black/[0.01]"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-ink-900">{entry.challengeTitle}</span>
                        <span className="text-[10px] text-ink-500 line-clamp-1">{entry.message}</span>
                      </div>
                      <div>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${resultBadge(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-ink-600 uppercase tracking-tighter">
                        {entry.mode}
                      </div>
                      <div className="text-[11px] text-ink-500 font-mono">
                        {entry.duration}s
                      </div>
                      <div className="text-[11px] font-bold text-ink-900">
                        {entry.score}
                      </div>
                      <div className="text-right text-[10px] text-ink-400 font-medium">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeView === 'sandbox' ? (
          <section className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {/* Left Sidebar: Navigator */}
            <aside className="flex w-full flex-col gap-4 lg:w-[300px] shrink-0">
              <div className="panel flex flex-col overflow-hidden">
                <div className="border-b border-black/[0.04] bg-black/[0.01] px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
                    Challenge Navigator
                  </span>
                </div>
                <div className="flex h-[300px] flex-col gap-1 overflow-y-auto p-2">
                  {challenges.map((challenge) => {
                    const isActive = challenge.id === activeChallengeId;
                    const isComplete = progress?.passes?.[challenge.id];

                    return (
                      <button
                        key={challenge.id}
                        type="button"
                        onClick={() => setActiveChallengeId(challenge.id)}
                        className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-black/5 ring-1 ring-black/5'
                            : 'hover:bg-black/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${isActive ? 'text-ink-900' : 'text-ink-700'}`}>
                            {challenge.title}
                          </span>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-ink-600' : 'text-ink-400'}`}>
                            {challenge.level}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-ink-500">
                          <span>{challenge.estimatedMinutes}m</span>
                          {isComplete && (
                            <CheckCircle2 className="h-3 w-3 text-sea-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="panel flex flex-col overflow-hidden">
                <div className="border-b border-black/[0.04] bg-black/[0.01] px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
                    File Explorer
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-2">
                  {Object.keys(activeFiles || {}).map((file) => {
                    const isLocked = activeChallenge?.lockedFiles?.includes(file);
                    const isActive = file === activeFile;
                    return (
                      <button
                        key={file}
                        type="button"
                        onClick={() => setActiveFile(file)}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-ink-900 text-white shadow-sm'
                            : 'text-ink-600 hover:bg-black/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <Lock className="h-3 w-3 opacity-70" />
                          ) : (
                            <GitBranch className="h-3 w-3 opacity-70" />
                          )}
                          <span>{file}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">Recent Runs</span>
                  <button onClick={handleClearHistory} className="text-[10px] font-bold text-ink-400 hover:text-ink-600 uppercase">Clear</button>
                </div>
                <div className="mt-3 space-y-2">
                  {activeHistory.slice(0, 3).map((entry, i) => (
                    <div key={i} className="flex flex-col gap-1 rounded-md border border-black/[0.03] p-2">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                        <span className={entry.status === 'pass' ? 'text-sea-500' : 'text-ember-500'}>{entry.status}</span>
                        <span className="text-ink-400">{entry.duration}s</span>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-ink-600">{entry.message}</p>
                    </div>
                  ))}
                  {activeHistory.length === 0 && <p className="text-center text-[10px] text-ink-400 py-4 italic">No history yet.</p>}
                </div>
              </div>
            </aside>

            {/* Middle: Editor */}
            <section className="panel flex min-w-0 flex-1 flex-col overflow-hidden min-h-[700px]">
              <div className="flex h-11 items-center justify-between border-b border-black/[0.04] bg-black/[0.01] px-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-ink-900">{activeFile}</span>
                  {isReadOnly && (
                    <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-ink-500">
                      Read Only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRun('run')}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-ink-900 px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    RUN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRun('submit')}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-sea-500 px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    SUBMIT
                  </button>
                  <div className="h-4 w-px bg-black/[0.08]" />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-ink-600 transition-colors hover:bg-black/[0.02]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
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

            {/* Right Sidebar: Preview & Results */}
            <aside className="flex w-full flex-col gap-4 lg:w-[420px] shrink-0">
              <div className="panel flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
                    Problem Description
                  </span>
                  <span className="rounded border border-black/5 bg-black/[0.02] px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
                    {activeChallenge?.level}
                  </span>
                </div>
                <h2 className="mt-2 text-base font-bold text-ink-900">
                  {activeChallenge?.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-ink-600">
                  {activeChallenge?.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(activeChallenge?.tags || []).map((tag) => (
                    <span key={tag} className="rounded-md border border-black/[0.04] bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-500 shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="panel flex flex-1 flex-col overflow-hidden min-h-[400px]">
                <div className="flex items-center justify-between border-b border-black/[0.04] bg-black/[0.01] px-2 py-1">
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'preview', label: 'Preview' },
                      { id: 'tests', label: 'Tests' },
                      { id: 'hint', label: 'Hint' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          activeTab === tab.id
                            ? 'text-ink-900 border-b-2 border-ink-900'
                            : 'text-ink-400 hover:text-ink-600'
                        }`}
                      >
                        {tab.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className={activeTab === 'preview' ? 'h-full' : 'h-0 overflow-hidden'}>
                    <Runner
                      files={activeFiles}
                      entryFile={activeChallenge?.entry}
                      challengeId={activeChallenge?.id}
                      runKey={runKey}
                      runId={runId}
                      onEvent={handleSandboxEvent}
                    />
                  </div>

                  {activeTab === 'tests' && (
                    <div className="flex h-full flex-col p-4 text-xs overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-tighter text-ink-400">Status</span>
                        <span className={`font-bold ${testResult.status === 'pass' ? 'text-sea-500' : 'text-ember-500'}`}>
                          {testResult.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-ink-700">{testResult.message}</p>
                      
                      <div className="mt-4 space-y-2">
                        {activeTests.map((test) => {
                          const current = caseResults[test.id] || { status: 'idle', message: '' };
                          return (
                            <div key={test.id} className="rounded-lg border border-black/[0.03] bg-black/[0.01] p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ink-900">{test.title}</span>
                                <span className={`text-[10px] font-bold uppercase ${current.status === 'pass' ? 'text-sea-500' : 'text-ember-500'}`}>
                                  {current.status}
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[10px] text-ink-500">
                                {current.message || test.expectation}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'hint' && (
                    <div className="flex h-full flex-col gap-3 p-4">
                      <input
                        type="password"
                        placeholder="OpenAI/Anthropic API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ink-900"
                      />
                      <button
                        onClick={handleHint}
                        disabled={hintState.status === 'loading'}
                        className="flex h-9 items-center justify-center gap-2 rounded-md bg-ink-900 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        REQUEST AI HINT
                      </button>
                      <div className="rounded-lg border border-black/[0.03] bg-black/[0.01] p-3 text-xs leading-relaxed text-ink-600">
                        {hintState.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default App;
