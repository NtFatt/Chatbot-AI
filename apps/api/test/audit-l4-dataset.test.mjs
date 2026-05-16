import { describe, expect, it } from 'vitest';

import {
  formatSummaryBlock,
  selectRecommendedDataset,
  summarizeDataset,
} from '../../../scripts/audit-l4-dataset.mjs';

describe('audit-l4-dataset', () => {
  it('summarizes export-ready counts without logging payload content', () => {
    const summary = summarizeDataset({
      id: 'dataset-1',
      name: 'DEV Synthetic L4 Tutor v1',
      examples: [
        {
          status: 'approved',
          inputMessages: [{ role: 'user', content: 'Giải thích OOP' }],
          idealResponse: 'OOP tổ chức code quanh object.',
        },
        {
          status: 'approved',
          inputMessages: [{ role: 'user', content: '   ' }],
          idealResponse: 'Thiếu prompt.',
        },
        {
          status: 'draft',
          inputMessages: [{ role: 'user', content: 'Ví dụ về JOIN' }],
          idealResponse: 'Pending review.',
        },
      ],
    });

    expect(summary).toEqual({
      id: 'dataset-1',
      name: 'DEV Synthetic L4 Tutor v1',
      totalExamples: 3,
      approved: 2,
      rejected: 0,
      pending: 1,
      emptyInput: 1,
      emptyIdeal: 0,
      validForExport: 1,
      recommendedForTraining: false,
    });
  });

  it('selects the dataset with the highest valid export count', () => {
    const recommended = selectRecommendedDataset([
      { id: 'a', name: 'A', validForExport: 12 },
      { id: 'b', name: 'B', validForExport: 27 },
      { id: 'c', name: 'C', validForExport: 27 },
    ]);

    expect(recommended?.id).toBe('b');
  });

  it('formats a compact summary block with threshold warnings', () => {
    const block = formatSummaryBlock(
      {
        id: 'dataset-2',
        name: 'Demo',
        approved: 24,
        rejected: 2,
        pending: 1,
        emptyInput: 0,
        emptyIdeal: 0,
        validForExport: 24,
      },
      'dataset-2',
    );

    expect(block).toContain('recommendedForTraining: yes');
    expect(block).toContain('warning: approved exportable examples below recommended demo threshold (100)');
    expect(block).not.toContain('Giải thích OOP');
  });
});
