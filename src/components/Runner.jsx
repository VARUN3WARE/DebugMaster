import { useEffect, useMemo } from 'react';
import { buildTestScript } from '../lib/tester';

const buildSandboxHtml = ({ combinedCode, testScript, title, runId }) => {
  const encodedCode = JSON.stringify(combinedCode);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        font-family: 'Space Grotesk', sans-serif;
        color: #111118;
        background: #fdf8f2;
      }
      body {
        margin: 0;
        padding: 24px;
      }
      .stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .label {
        font-size: 14px;
      }
      .count {
        font-size: 24px;
        font-weight: 600;
      }
      button {
        border: none;
        border-radius: 999px;
        padding: 10px 16px;
        background: #ff7a18;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        width: fit-content;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>

    <script>
      const __debug = {
        logCount: 0,
        fetchCount: 0,
        logs: [],
        activeIntervals: new Set(),
      };

      window.__debug = __debug;

      const post = (type, payload) => {
        window.parent.postMessage(
          { source: 'senioritytrap', type, payload, runId: '${runId}' },
          '*',
        );
      };

      post('stats', {
        logCount: __debug.logCount,
        fetchCount: __debug.fetchCount,
        intervalCount: __debug.activeIntervals.size,
      });

      const originalLog = console.log;
      console.log = (...args) => {
        __debug.logCount += 1;
        __debug.logs.push(args.map(String));
        post('log', { logs: __debug.logs, logCount: __debug.logCount });
        originalLog(...args);
      };

      window.__trackFetch = () => {
        __debug.fetchCount += 1;
        post('stats', {
          logCount: __debug.logCount,
          fetchCount: __debug.fetchCount,
          intervalCount: __debug.activeIntervals.size,
        });
      };

      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        window.__trackFetch();
        return originalFetch(...args);
      };

      const originalSetInterval = window.setInterval;
      const originalClearInterval = window.clearInterval;

      window.setInterval = (...args) => {
        const id = originalSetInterval(...args);
        __debug.activeIntervals.add(id);
        post('stats', {
          logCount: __debug.logCount,
          fetchCount: __debug.fetchCount,
          intervalCount: __debug.activeIntervals.size,
        });
        return id;
      };

      window.clearInterval = (id) => {
        __debug.activeIntervals.delete(id);
        post('stats', {
          logCount: __debug.logCount,
          fetchCount: __debug.fetchCount,
          intervalCount: __debug.activeIntervals.size,
        });
        return originalClearInterval(id);
      };

      window.__report = (payload) => {
        post('test', payload);
      };

      window.__reportCase = (payload) => {
        post('case', payload);
      };
    </script>

    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <script>
      const userCode = ${encodedCode};
      try {
        const output = Babel.transform(userCode, { presets: ['react'] }).code;
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = output;
        document.body.appendChild(script);
      } catch (error) {
        window.__report({
          status: 'fail',
          message: 'Build error: ' + error.message,
        });
      }
    </script>

    <script>
      ${testScript}
    </script>
  </body>
</html>`;
};

const Runner = ({ files, entryFile, challenge, runKey, runId, onEvent }) => {
  const combinedCode = useMemo(() => {
    const ordered = Object.keys(files || {});
    const safeEntry = entryFile && ordered.includes(entryFile) ? entryFile : ordered[0];

    const beforeEntry = ordered.filter((file) => file !== safeEntry);
    const order = [...beforeEntry, safeEntry].filter(Boolean);

    return order
      .map((file) => `// File: ${file}\n${files[file] || ''}`)
      .join('\n\n');
  }, [files, entryFile]);

  const sandboxHtml = useMemo(() => {
    return buildSandboxHtml({
      combinedCode,
      testScript: buildTestScript(challenge),
      title: `Preview: ${challenge?.id ?? 'challenge'}`,
      runId,
    });
  }, [challenge, combinedCode, runId]);

  useEffect(() => {
    if (!onEvent) {
      return undefined;
    }

    const handleMessage = (event) => {
      if (event.data?.source !== 'senioritytrap') {
        return;
      }
      onEvent(event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEvent]);

  return (
    <iframe
      key={runKey}
      title="Sandbox preview"
      sandbox="allow-scripts"
      className="h-full w-full rounded-xl border border-sand-200 bg-white"
      srcDoc={sandboxHtml}
    />
  );
};

export default Runner;
