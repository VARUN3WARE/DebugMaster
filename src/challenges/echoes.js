import { coreChallenges } from './challenges';

const levelByTemplate = {
  'shadow-state': 'Mid',
  'infinite-loop': 'Mid',
  'memory-leak': 'Senior',
  'broken-pipeline': 'Senior',
};

const buildEchoObjectives = (templateTitle) => {
  return [
    'Resolve the symptom described in the sanitized issue report.',
    `Use the ${templateTitle} sandbox without leaking the original repository details.`,
  ];
};

const buildEchoInsight = (repo, pullRequest) => {
  if (pullRequest?.title) {
    return `This arena echoes a real bug from ${repo}. Once you pass, compare your approach against the historical pull request: ${pullRequest.title}.`;
  }

  return `This arena echoes a real bug from ${repo}. The GitHub issue grounded the scenario, and the sandbox maps it onto one of DebugMaster's training templates.`;
};

const buildEchoDescription = (issue) => {
  const lines = [
    issue.sanitized.sections.summary,
    issue.sanitized.sections.steps && `Repro: ${issue.sanitized.sections.steps}`,
    issue.sanitized.sections.expected &&
      `Expected: ${issue.sanitized.sections.expected}`,
  ].filter(Boolean);

  return lines.join(' ');
};

export const createEchoChallenge = ({ issue, pullRequest, files }) => {
  const template =
    coreChallenges.find((challenge) => challenge.id === issue.templateId) ||
    coreChallenges[0];

  const challengeFiles = files || { ...template.files };
  const entry = files ? Object.keys(files)[0] : template.entry;

  return {
    ...template,
    id: `echo-${issue.repo.replace('/', '-')}-${issue.number}`,
    title: `Echo: ${issue.sanitized.sanitizedTitle}`,
    level: levelByTemplate[template.id] || template.level,
    description: buildEchoDescription(issue) || template.description,
    estimatedMinutes: Math.max(template.estimatedMinutes, 14),
    objectives: buildEchoObjectives(template.title),
    tags: Array.from(new Set(['Real-World', 'GitHub', ...template.tags])),
    sourceType: 'real-world',
    templateId: template.id,
    seniorInsight: buildEchoInsight(issue.repo, pullRequest),
    seniorSolution: pullRequest?.title || template.seniorSolution,
    files: challengeFiles,
    entry,
    origin: {
      repo: issue.repo,
      issueNumber: issue.number,
      issueUrl: issue.url,
      issueTitle: issue.title,
      closedAt: issue.closedAt,
      comments: issue.comments,
      templateId: template.id,
      templateTitle: template.title,
      sections: issue.sanitized.sections,
      pullRequest,
      realCodeImported: !!files,
    },
  };
};
