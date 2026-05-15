const STORAGE_KEY = 'senioritytrap_progress_v1';

const defaultProgress = {
  passes: {},
  history: {},
};

export const loadProgress = () => {
  if (typeof window === 'undefined') {
    return { ...defaultProgress };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultProgress };
    }

    const parsed = JSON.parse(raw);
    return {
      passes: parsed?.passes || {},
      history: parsed?.history || {},
    };
  } catch {
    return { ...defaultProgress };
  }
};

export const saveProgress = (progress) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const recordHistoryEntry = (progress, challengeId, entry, limit = 6) => {
  const previous = progress?.history?.[challengeId] || [];
  const next = [entry, ...previous].slice(0, limit);

  return {
    passes: progress?.passes || {},
    history: {
      ...(progress?.history || {}),
      [challengeId]: next,
    },
  };
};
