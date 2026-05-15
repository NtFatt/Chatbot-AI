import { describe, expect, it } from 'vitest';

import {
  collectApprovedRecords,
  enforceDatasetSize,
  serializeRecordsToJsonl,
  splitRecords,
} from '../../../scripts/export-l4-dataset.mjs';

describe('export-l4-dataset', () => {
  it('exports only approved, non-empty examples as valid HF chat JSONL', () => {
    const records = collectApprovedRecords([
      {
        id: 'b-example',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: 'Giải thích OOP trong Java' }],
        idealResponse: 'OOP tổ chức code quanh class và object.',
      },
      {
        id: 'a-rejected',
        status: 'REJECTED',
        inputMessages: [{ role: 'user', content: 'Should not export' }],
        idealResponse: 'Rejected',
      },
      {
        id: 'c-empty-input',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: '   ' }],
        idealResponse: 'Missing prompt',
      },
      {
        id: 'd-empty-response',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: 'Has prompt' }],
        idealResponse: '   ',
      },
    ]);

    expect(records).toHaveLength(1);
    const jsonl = serializeRecordsToJsonl(records);
    const lines = jsonl.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý học tập AI. Bạn sẽ giúp học sinh với bài tập một cách chính xác và cẩn thận.',
        },
        { role: 'user', content: 'Giải thích OOP trong Java' },
        { role: 'assistant', content: 'OOP tổ chức code quanh class và object.' },
      ],
    });
  });

  it('preserves Vietnamese Unicode and deterministic train-validation splitting', () => {
    const records = collectApprovedRecords([
      {
        id: 'example-3',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: 'Giải thích tính kế thừa' }],
        idealResponse: 'Kế thừa cho phép lớp con tái sử dụng hành vi của lớp cha.',
      },
      {
        id: 'example-1',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: 'Giải thích đóng gói' }],
        idealResponse: 'Đóng gói giúp bảo vệ dữ liệu nội bộ.',
      },
      {
        id: 'example-2',
        status: 'APPROVED',
        inputMessages: [{ role: 'user', content: 'Giải thích đa hình' }],
        idealResponse: 'Đa hình cho phép một interface có nhiều cách triển khai.',
      },
    ]);

    const firstExport = splitRecords(records, 0.34, true);
    const secondExport = splitRecords(records, 0.34, true);

    expect(firstExport).toEqual(secondExport);
    expect(firstExport.validationRecords).toHaveLength(1);
    expect(firstExport.trainRecords).toHaveLength(2);
    expect(JSON.stringify(firstExport.validationRecords[0])).toContain('Đóng gói');
    expect(JSON.stringify(firstExport.trainRecords)).toContain('Đa hình');
  });

  it('guards against very small datasets unless explicitly allowed', () => {
    expect(() => enforceDatasetSize(3, false)).toThrow(
      'Dataset only has 3 exportable approved examples. Need at least 20, or pass --allow-small.',
    );
    expect(() => enforceDatasetSize(3, true)).not.toThrow();
  });
});
