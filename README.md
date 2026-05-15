# SeniorityTrap

A debug-first training ground that mimics a LeetCode-style workflow for fixing real-world React bugs.

## Why this exists
Writing code is cheaper than verifying it. SeniorityTrap focuses on the skill that is still expensive: finding and fixing issues in existing code with minimal noise.

## MVP scope
- Three curated bugs that show progression from junior to senior.
- Frontend-only execution to avoid backend security and latency.
- Fast validation with a sandboxed iframe and lightweight test scripts.

## Core features
- Monaco editor with a file explorer and locked files.
- Sandboxed React preview with iframe + Babel.
- Validation panel with per-test case status and run history.
- Seniority score based on time and console log count.
- AI hint button that explains why the bug exists, not the fix.

## Challenges
1. Junior: The Shadow State
	- A stale state update causes a double increment to collapse.
2. Mid: The Infinite Loop
	- A dependency cycle causes a fetch effect to run repeatedly.
3. Senior: The Memory Leak
	- An interval continues running after unmount.

## How it works
- Challenge files are stitched into one script and compiled in the browser.
- Tests run inside the iframe and post results back to the parent UI.
- Fetches, intervals, and console logs are instrumented to score seniority.

## Local development
- Install dependencies: `npm install`
- Run the dev server: `npm run dev`
- Production build: `npm run build`

## AI hint configuration
- Enter an API key in the Hint tab.
- Optional env vars:
  - `VITE_LLM_ENDPOINT`
  - `VITE_LLM_MODEL`

## Submission write-up
**What I built:**
A debug-first training ground. Most platforms teach you how to write code, but industry reality is 70 percent reading and fixing. This app creates broken environments where you must use professional debugging skills to pass.

**Why this:**
AI makes writing code cheap, but verifying code expensive. We need tools that train humans to become expert reviewers.

**What I cut:**
I cut backend execution. A browser-based JS sandbox removes most of the latency and cost, making it faster and easier to ship.
