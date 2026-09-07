import { beforeEach, describe, expect, it } from 'vitest';

import {
  FOCUS_PANELS,
  WORKBENCH_VIEW_KEY,
  readWorkbenchView,
  writeWorkbenchView,
} from './workbenchView';

describe('workbench view persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to expert mode for a first visit', () => {
    expect(readWorkbenchView()).toBe('expert');
  });

  it('preserves an explicit focus choice under the documented key', () => {
    writeWorkbenchView('focus');
    expect(localStorage.getItem(WORKBENCH_VIEW_KEY)).toBe('focus');
    expect(readWorkbenchView()).toBe('focus');
  });

  it('falls back to expert when the stored value is not a view', () => {
    localStorage.setItem(WORKBENCH_VIEW_KEY, 'dashboard');
    expect(readWorkbenchView()).toBe('expert');
  });

  it('steps through Run, Inspect evidence, Reconcile answer in that order', () => {
    expect(FOCUS_PANELS.map((panel) => panel.label)).toEqual([
      'Run',
      'Inspect evidence',
      'Reconcile answer',
    ]);
  });
});
