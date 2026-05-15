const testSuites = {
  'shadow-state': `
    const reportCase = (id, status, message) => {
      if (window.__reportCase) {
        window.__reportCase({ id, status, message });
      }
    };

    const runTests = async () => {
      const button = document.querySelector('[data-testid="quick-add"]') || 
                     Array.from(document.querySelectorAll('button')).find(b => /add|inc|plus|\+/i.test(b.textContent));
      const countEl = document.querySelector('[data-testid="count"]') || 
                      Array.from(document.querySelectorAll('div, span, p')).find(el => /^\d+$/.test(el.textContent.trim()));

      if (!button || !countEl) {
        reportCase('double-increment', 'fail', 'Missing counter elements.');
        window.__report({ status: 'fail', message: 'Missing counter elements.' });
        return;
      }

      button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));

      const count = Number(countEl.textContent);
      if (count === 2) {
        reportCase('double-increment', 'pass', 'Quick add applied twice.');
        window.__report({ status: 'pass', message: 'State updates correctly.' });
        return;
      }

      reportCase(
        'double-increment',
        'fail',
        'Expected 2 after quick add, got ' + count + '.',
      );
      window.__report({
        status: 'fail',
        message: 'Expected 2 after quick add, got ' + count + '.',
      });
    };

    setTimeout(runTests, 160);
  `,
  'infinite-loop': `
    const reportCase = (id, status, message) => {
      if (window.__reportCase) {
        window.__reportCase({ id, status, message });
      }
    };

    const runTests = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const fetchCount =
        window.__debug && typeof window.__debug.fetchCount === 'number'
          ? window.__debug.fetchCount
          : 0;
      const userEl = document.querySelector('[data-testid="user"]') || 
                     Array.from(document.querySelectorAll('div, span, p')).find(el => el.textContent.length > 2 && !el.textContent.includes('Status') && !el.textContent.includes('...'));
      const name = userEl ? userEl.textContent.trim() : '';

      if (!name || name === 'Loading...' || name.includes('...')) {
        reportCase('user-loaded', 'fail', 'User name is missing.');
        window.__report({ status: 'fail', message: 'User never loaded.' });
        return;
      }

      reportCase('user-loaded', 'pass', 'User loaded successfully.');

      if (fetchCount > 4) {
        reportCase(
          'fetch-threshold',
          'fail',
          'Fetch count too high (' + fetchCount + ').',
        );
        window.__report({
          status: 'fail',
          message: 'Too many fetches detected (' + fetchCount + ').',
        });
        return;
      }

      reportCase(
        'fetch-threshold',
        'pass',
        'Fetch count stable (' + fetchCount + ').',
      );
      window.__report({
        status: 'pass',
        message: 'Fetch count stable (' + fetchCount + ').',
      });
    };

    setTimeout(runTests, 200);
  `,
  'memory-leak': `
    const reportCase = (id, status, message) => {
      if (window.__reportCase) {
        window.__reportCase({ id, status, message });
      }
    };

    const runTests = async () => {
      const toggle = document.querySelector('[data-testid="toggle"]') || 
                     Array.from(document.querySelectorAll('button')).find(b => /mount|toggle|close|unmount/i.test(b.textContent));
      if (!toggle) {
        reportCase('interval-cleanup', 'fail', 'Toggle button not found.');
        window.__report({ status: 'fail', message: 'Toggle button not found.' });
        return;
      }

      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 700));

      const activeIntervals =
        window.__debug && window.__debug.activeIntervals
          ? window.__debug.activeIntervals.size
          : 0;
      if (activeIntervals === 0) {
        reportCase('interval-cleanup', 'pass', 'Intervals cleaned up.');
        window.__report({ status: 'pass', message: 'Intervals cleaned up.' });
        return;
      }

      reportCase(
        'interval-cleanup',
        'fail',
        'Interval still running (' + activeIntervals + ').',
      );
      window.__report({
        status: 'fail',
        message: 'Interval still running (' + activeIntervals + ').',
      });
    };

    setTimeout(runTests, 200);
  `,
  'broken-pipeline': `
    const reportCase = (id, status, message) => {
      if (window.__reportCase) {
        window.__reportCase({ id, status, message });
      }
    };

    const runTests = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const resultEl = document.querySelector('[data-testid="result"]');
      const text = resultEl ? resultEl.textContent.trim() : '';

      if (text.includes('ID: 101') && text.includes('Cascade')) {
        reportCase('pipeline-contract', 'pass', 'Contract restored.');
        window.__report({ status: 'pass', message: 'Data pipeline is healthy.' });
        return;
      }

      reportCase(
        'pipeline-contract',
        'fail',
        'Expected ID: 101 - Cascade, got "' + text + '".',
      );
      window.__report({
        status: 'fail',
        message: 'Pipeline mismatch detected.',
      });
    };

    setTimeout(runTests, 200);
  `,
};

export const buildTestScript = (challenge) => {
  if (!challenge) {
    return '';
  }

  return testSuites[challenge.id] ?? testSuites[challenge.templateId] ?? '';
};
