import { curatedRepos } from '../lib/githubEchoes';

const RealBugImporter = ({
  repoInput,
  onRepoInputChange,
  tokenInput,
  onTokenInputChange,
  onDiscover,
  discoveryState,
  discoveredIssues,
  onImportIssue,
  importingId,
}) => {
  return (
    <div className="flex h-[300px] flex-col">
      <div className="space-y-3 border-b border-black/[0.04] p-3">
        <div>
          <p className="text-[11px] font-semibold text-ink-700">
            Start from a curated repo
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {curatedRepos.map((repo) => (
              <button
                key={repo}
                type="button"
                onClick={() => onRepoInputChange(repo)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  repoInput === repo
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-black/10 bg-white text-ink-500 hover:border-ink-900/20 hover:text-ink-700'
                }`}
              >
                {repo}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={repoInput}
            onChange={(event) => onRepoInputChange(event.target.value)}
            placeholder="facebook/react"
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-ink-700 focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => onTokenInputChange(event.target.value)}
            placeholder="Optional GitHub token for higher rate limits"
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-ink-700 focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <button
            type="button"
            onClick={onDiscover}
            disabled={discoveryState.status === 'loading'}
            className="flex h-9 w-full items-center justify-center rounded-lg bg-ink-900 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {discoveryState.status === 'loading'
              ? 'DISCOVERING CLOSED BUGS...'
              : 'DISCOVER CLOSED BUGS'}
          </button>
        </div>

        <div className="rounded-lg border border-black/[0.04] bg-black/[0.02] px-3 py-2 text-[10px] leading-relaxed text-ink-500">
          Import maps a historical issue onto a DebugMaster sandbox. When
          possible, we fetch the **actual buggy code** from the historical commit.
          Otherwise, we map the symptom to one of our expert templates.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {discoveryState.message ? (
          <div className="mb-2 rounded-lg border border-black/[0.04] bg-black/[0.02] px-3 py-2 text-[10px] text-ink-500">
            {discoveryState.message}
          </div>
        ) : null}

        {discoveredIssues.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] italic text-ink-400">
            No imported issue selected yet. Pick a repo and pull in a few closed
            bug reports.
          </div>
        ) : (
          <div className="space-y-2">
            {discoveredIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-xl border border-black/[0.05] bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-ink-900">
                      {issue.sanitized.sanitizedTitle}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-400">
                      {issue.summary.meta}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/[0.03] px-2 py-1 text-[9px] font-bold uppercase text-ink-500">
                    {issue.templateId.replace('-', ' ')}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-ink-600">
                  {issue.summary.brief}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold uppercase tracking-widest text-ink-400 transition-colors hover:text-ink-700"
                  >
                    View Issue
                  </a>
                  <button
                    type="button"
                    onClick={() => onImportIssue(issue)}
                    disabled={importingId === issue.id}
                    className="rounded-lg bg-ember-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {importingId === issue.id ? 'Importing...' : 'Import To Arena'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealBugImporter;
