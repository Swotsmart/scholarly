/**
 * use-mathcanvas.ts — Chunk 5 Extension Patch
 *
 * Adds REPL mode and step-by-step working state to the existing hook.
 * This file is a PATCH — merge its contents into use-mathcanvas.ts.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DEPLOYMENT NOTE:
 *   1. Add the imports to the top of use-mathcanvas.ts
 *   2. Add REPLState type and new state variables inside useMathCanvas()
 *   3. Add the new action functions inside useMathCanvas()
 *   4. Add new entries to the return object
 *   5. Add 'repl' to the ExtCanvasMode type in MathCanvasPage.tsx
 * ─────────────────────────────────────────────────────────────────────
 *
 * KEY ARCHITECTURAL NOTE:
 *   The REPL and Steps calls go via the TypeScript API layer (mathkernel-client),
 *   NOT directly to the Python service from the browser.  This is consistent
 *   with the existing pattern — the browser calls the Next.js/Express API,
 *   which proxies to the microservice.  The browser never calls port 8001 directly.
 */

// ─── PATCH: ADD TO IMPORTS ───────────────────────────────────────────────────

// import { replEvaluate, stepsGenerate } from '@/lib/mathcanvas-repl-client';
// import type { REPLResponse, StepsResponse, WorkingStep } from '@/types/mathcanvas';

// ─── PATCH: ADD TYPES ────────────────────────────────────────────────────────

/*
Add to types/mathcanvas.ts (or inline here if preferred):

export interface REPLEntry {
  id: string;
  command: string;
  expression: string;
  response: REPLResponse;
  steps?: StepsResponse | null;
}

export interface REPLState {
  history: REPLEntry[];
  activeCommand: string;
  isEvaluating: boolean;
  error: string | null;
}
*/

// ─── PATCH: ADD STATE VARIABLES inside useMathCanvas() ──────────────────────

/*
  const [replState, setReplState] = useState<REPLState>({
    history: [],
    activeCommand: 'diff',
    isEvaluating: false,
    error: null,
  });
*/

// ─── PATCH: ADD ACTION FUNCTIONS inside useMathCanvas() ─────────────────────

/*
  // ── REPL: evaluate a CAS command ──────────────────────────────────────────
  const replEval = useCallback(async (
    command: string,
    expression: string,
    opts?: {
      variable?: string;
      lower?: number;
      upper?: number;
      point?: number;
      order?: number;
    }
  ): Promise<REPLResponse> => {
    setReplState(prev => ({ ...prev, isEvaluating: true, error: null }));
    try {
      // Call via the API layer (avoids direct browser → port 8001)
      const res = await fetch('/api/mathcanvas/repl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, expression, ...opts }),
      });
      const data: REPLResponse = await res.json();

      const entry: REPLEntry = {
        id: `repl-${Date.now()}`,
        command,
        expression,
        response: data,
      };

      setReplState(prev => ({
        ...prev,
        history: [...prev.history.slice(-19), entry],
        isEvaluating: false,
      }));

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'REPL error';
      setReplState(prev => ({ ...prev, isEvaluating: false, error: msg }));
      return {
        success: false, command, expression,
        result: '', latex: '', steps_available: false, error: msg,
      };
    }
  }, []);

  // ── Steps: request step-by-step working ──────────────────────────────────
  const requestSteps = useCallback(async (
    operation: string,
    expression: string,
    variable?: string,
    lower?: number,
    upper?: number,
  ): Promise<StepsResponse> => {
    try {
      const res = await fetch('/api/mathcanvas/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, expression, variable, lower, upper }),
      });
      return await res.json() as StepsResponse;
    } catch (err) {
      return {
        success: false, operation, expression,
        final_result: '', final_latex: '', steps: [],
        error: err instanceof Error ? err.message : 'Steps unavailable',
      };
    }
  }, []);

  // ── REPL: clear history ───────────────────────────────────────────────────
  const clearREPLHistory = useCallback(() => {
    setReplState(prev => ({ ...prev, history: [] }));
  }, []);
*/

// ─── PATCH: ADD TO RETURN OBJECT inside useMathCanvas() ─────────────────────

/*
    // Chunk 5 — REPL and Steps
    replState,
    replEval,
    requestSteps,
    clearREPLHistory,
*/

// ─── PATCH END ──────────────────────────────────────────────────────────────

export {}; // makes this file a module — remove if merging inline
