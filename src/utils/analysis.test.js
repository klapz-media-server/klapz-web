import { describe, expect, it } from 'vitest';
import { analysisStage } from './analysis';

const library = (fileCount, readFileCount, completeFileCount) => ({
  fileCount,
  readFileCount,
  completeFileCount,
  reading: true,
  failure: null,
});

describe('analysisStage', () => {
  it('reads every header before measuring any file', () => {
    expect(analysisStage(library(300, 120, 0))).toEqual({ round: 'headers', done: 120, total: 300 });
    expect(analysisStage(library(300, 300, 40))).toEqual({ round: 'packets', done: 40, total: 300 });
  });

  it('has nothing left once every file is measured, or for a library it does not read', () => {
    expect(analysisStage(library(300, 300, 300))).toBeNull();
    expect(analysisStage(library(0, 0, 0))).toBeNull();
    expect(analysisStage(null)).toBeNull();
  });
});
