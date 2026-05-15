const testSuites = {
  'shadow-state': `
    const runTests = async () => {
      const button = document.querySelector('[data-testid="quick-add"]');
      const countEl = document.querySelector('[data-testid="count"]');

      if (!button || !countEl) {
        window.__report({ status: 'fail', message: 'Missing counter elements.' });
        return;
      }

      button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));

      const count = Number(countEl.textContent);
      if (count === 2) {
        window.__report({ status: 'pass', message: 'State updates correctly.' });
        return;
      }

      window.__report({
        status: 'fail',
        message: `Expected 2 after quick add, got ${count}.`,
      });
    };

    setTimeout(runTests, 160);
  `,
  'infinite-loop': `
    const runTests = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const fetchCount = window.__debug?.fetchCount ?? 0;
      const name = document
        .querySelector('[data-testid="user"]')
        ?.textContent?.trim();

      if (!name || name === 'Loading...') {
        window.__report({ status: 'fail', message: 'User never loaded.' });
        return;
      }

      if (fetchCount > 4) {
        window.__report({
          status: 'fail',
          message: `Too many fetches detected (${fetchCount}).`,
        });
        return;
      }

      window.__report({
        status: 'pass',
        message: `Fetch count stable (${fetchCount}).`,
      });
    };

    setTimeout(runTests, 200);
  `,
  'memory-leak': `
    const runTests = async () => {
      const toggle = document.querySelector('[data-testid="toggle"]');
      if (!toggle) {
        window.__report({ status: 'fail', message: 'Toggle button not found.' });
        return;
      }

      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 700));

      const activeIntervals = window.__debug?.activeIntervals?.size ?? 0;
      if (activeIntervals === 0) {
        window.__report({ status: 'pass', message: 'Intervals cleaned up.' });
        return;
      }

      window.__report({
        status: 'fail',
        message: `Interval still running (${activeIntervals}).`,
      });
    };

    setTimeout(runTests, 200);
  `,
};

export const buildTestScript = (challengeId) => {
  return testSuites[challengeId] ?? '';
};
