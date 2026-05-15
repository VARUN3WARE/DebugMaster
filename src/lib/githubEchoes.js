const SECTION_PATTERNS = [
  { key: 'steps', match: /steps?\s+to\s+reproduce|reproduction|reproduce/i },
  { key: 'expected', match: /expected\s+behavior|expected\s+result/i },
  { key: 'actual', match: /actual\s+behavior|current\s+behavior|what\s+happened/i },
  { key: 'summary', match: /description|summary|bug|issue/i },
];

const SKIP_SECTION_PATTERN =
  /environment|browser|version|os|platform|sandbox|codesandbox|stackblitz|additional\s+context/i;

const TEMPLATE_RULES = [
  {
    templateId: 'memory-leak',
    pattern: /memory leak|unmount|cleanup|clearinterval|setinterval|timer|subscription/i,
  },
  {
    templateId: 'infinite-loop',
    pattern: /infinite loop|useeffect|re-fetch|refetch|rerender|re-render|dependency|fetch/i,
  },
  {
    templateId: 'shadow-state',
    pattern: /stale state|batch|double click|double update|setstate|increment|counter/i,
  },
  {
    templateId: 'broken-pipeline',
    pattern: /payload|contract|schema|adapter|transform|data flow|response/i,
  },
];

export const curatedRepos = [
  'facebook/react',
  'vercel/next.js',
  'TanStack/query',
  'remix-run/react-router',
  'vuejs/core',
];

const escapeRegExp = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const normalizeWhitespace = (value = '') => {
  return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
};

const humanizeRateLimit = (response) => {
  const reset = response.headers.get('x-ratelimit-reset');
  if (!reset) {
    return 'GitHub rate limit reached. Add a token and try again.';
  }

  const resetAt = new Date(Number(reset) * 1000);
  if (Number.isNaN(resetAt.getTime())) {
    return 'GitHub rate limit reached. Add a token and try again.';
  }

  return `GitHub rate limit reached until ${resetAt.toLocaleTimeString()}.`;
};

export const parseRepoInput = (input = '') => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Paste a repository like facebook/react or a full GitHub URL.');
  }

  const normalized = trimmed.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
  const [owner, repo] = normalized.split('/');

  if (!owner || !repo) {
    throw new Error('Repository format should look like owner/repo.');
  }

  return `${owner}/${repo}`;
};

const splitMarkdownSections = (body = '') => {
  const sections = [];
  let current = { heading: 'summary', content: [] };

  normalizeWhitespace(body)
    .split('\n')
    .forEach((line) => {
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) {
        sections.push(current);
        current = { heading: headingMatch[1].trim(), content: [] };
        return;
      }

      const strongHeadingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
      if (strongHeadingMatch) {
        sections.push(current);
        current = { heading: strongHeadingMatch[1].trim(), content: [] };
        return;
      }

      current.content.push(line);
    });

  sections.push(current);

  return sections
    .map((section) => ({
      heading: section.heading,
      content: normalizeWhitespace(section.content.join('\n')),
    }))
    .filter((section) => section.content);
};

const maskIdentifiers = (value = '', repo) => {
  const [owner, repoName] = repo.split('/');

  return value
    .replaceAll(repo, 'the project')
    .replace(new RegExp(escapeRegExp(owner), 'gi'), 'the maintainer')
    .replace(new RegExp(escapeRegExp(repoName), 'gi'), 'the library')
    .replace(/https?:\/\/\S+/g, '[link removed]')
    .replace(/`([^`]+)`/g, (_, identifier) => {
      if (identifier.length > 28) {
        return '`sample code`';
      }
      return '`internal symbol`';
    });
};

export const sanitizeIssue = (issue, repo) => {
  const bodySections = splitMarkdownSections(issue.body || '');
  const extracted = {
    summary: '',
    steps: '',
    expected: '',
    actual: '',
  };

  bodySections.forEach((section) => {
    if (SKIP_SECTION_PATTERN.test(section.heading)) {
      return;
    }

    const match = SECTION_PATTERNS.find((entry) => entry.match.test(section.heading));
    if (!match || extracted[match.key]) {
      return;
    }

    extracted[match.key] = maskIdentifiers(section.content, repo);
  });

  if (!extracted.summary) {
    extracted.summary = maskIdentifiers((issue.body || '').slice(0, 280), repo);
  }

  return {
    sanitizedTitle: maskIdentifiers(issue.title || `Issue #${issue.number}`, repo),
    sections: extracted,
  };
};

export const chooseTemplateId = (issue) => {
  const haystack = `${issue.title || ''}\n${issue.body || ''}`;
  const match = TEMPLATE_RULES.find((rule) => rule.pattern.test(haystack));
  return match?.templateId || 'broken-pipeline';
};

const buildIssueSummary = ({ number, comments, closedAt, sanitized }) => {
  const parts = [`#${number}`];

  if (closedAt) {
    const year = new Date(closedAt).getFullYear();
    if (!Number.isNaN(year)) {
      parts.push(`Closed ${year}`);
    }
  }

  if (typeof comments === 'number') {
    parts.push(`${comments} comments`);
  }

  const details = [
    sanitized.sections.summary,
    sanitized.sections.steps,
    sanitized.sections.expected ? `Expected: ${sanitized.sections.expected}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    meta: parts.join(' • '),
    brief: details || 'Imported from a closed GitHub bug report.',
  };
};

const fetchJson = async (url, token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 403) {
    throw new Error(humanizeRateLimit(response));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'GitHub request failed.');
  }

  return response.json();
};

export const fetchClosingPullRequest = async ({ repo, issueNumber, token }) => {
  const query = encodeURIComponent(
    `repo:${repo} is:pr is:merged "${issueNumber}" in:body`,
  );

  const data = await fetchJson(
    `https://api.github.com/search/issues?q=${query}&per_page=5&sort=updated&order=desc`,
    token,
  );

  const pull = (data.items || []).find((item) => {
    const body = item.body || '';
    return new RegExp(
      `(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\\s+#${issueNumber}\\b`,
      'i',
    ).test(body);
  }) || data.items?.[0];

  if (!pull) {
    return null;
  }

  return {
    number: pull.number,
    title: pull.title,
    url: pull.html_url,
    baseSha: pull.base?.sha || null,
  };
};

export const fetchPRFiles = async ({ repo, pullNumber, token }) => {
  return fetchJson(
    `https://api.github.com/repos/${repo}/pulls/${pullNumber}/files?per_page=30`,
    token,
  );
};

export const fetchFileContent = async ({ repo, path, ref, token }) => {
  const data = await fetchJson(
    `https://api.github.com/repos/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`,
    token,
  );

  if (data.encoding === 'base64') {
    // Robust base64 decoding for UTF-8
    return decodeURIComponent(
      atob(data.content.replace(/\s/g, ''))
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
  }

  return data.content;
};

export const fetchRealWorldBugScenario = async ({ repo, issueNumber, token }) => {
  const pull = await fetchClosingPullRequest({ repo, issueNumber, token });
  if (!pull || !pull.baseSha) {
    return { pullRequest: pull, files: null };
  }

  const files = await fetchPRFiles({ repo, pullNumber: pull.number, token });
  const bestFile =
    files.find((f) => f.filename.endsWith('.jsx') || f.filename.endsWith('.js')) ||
    files[0];

  if (!bestFile) {
    return { pullRequest: pull, files: null };
  }

  try {
    const buggyContent = await fetchFileContent({
      repo,
      path: bestFile.filename,
      ref: pull.baseSha,
      token,
    });

    return {
      pullRequest: pull,
      files: {
        [bestFile.filename.split('/').pop()]: buggyContent,
      },
    };
  } catch (error) {
    console.error('Failed to fetch real buggy code:', error);
    return { pullRequest: pull, files: null };
  }
};

export const fetchRepoBugIssues = async ({ repo, token, limit = 8 }) => {
  const query = encodeURIComponent(
    `repo:${repo} is:issue is:closed label:bug`,
  );

  const data = await fetchJson(
    `https://api.github.com/search/issues?q=${query}&per_page=${limit}&sort=updated&order=desc`,
    token,
  );

  return (data.items || []).map((issue) => {
    const sanitized = sanitizeIssue(issue, repo);

    return {
      id: `github-${repo.replace('/', '-')}-${issue.number}`,
      repo,
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      body: issue.body || '',
      comments: issue.comments || 0,
      closedAt: issue.closed_at,
      templateId: chooseTemplateId(issue),
      sanitized,
      summary: buildIssueSummary({
        number: issue.number,
        comments: issue.comments,
        closedAt: issue.closed_at,
        sanitized,
      }),
    };
  });
};
