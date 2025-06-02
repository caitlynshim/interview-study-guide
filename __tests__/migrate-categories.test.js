import { jest } from '@jest/globals';
import * as openai from '../lib/openai.js';
import Experience from '../models/Experience.js';

jest.mock('../lib/openai.js');
jest.mock('../models/Experience.js');

describe('migrate-categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update only metadata.category in write mode', async () => {
    const save = jest.fn();
    const exps = [
      { title: 'Test', content: 'Test content', metadata: {}, save },
      { title: 'HasCat', content: 'Test', metadata: { category: 'Leadership' }, save },
    ];
    Experience.find.mockResolvedValue(exps);
    openai.generateCategory.mockResolvedValue('Customer Focus');
    process.argv.push('--write');
    await import('../scripts/migrate-categories.js');
    expect(exps[0].metadata.category).toBe('Customer Focus');
    expect(save).toHaveBeenCalled();
    expect(exps[1].metadata.category).toBe('Leadership');
  });

  it('should not write in dry-run mode', async () => {
    const save = jest.fn();
    const exps = [
      { title: 'Test', content: 'Test content', metadata: {}, save },
    ];
    Experience.find.mockResolvedValue(exps);
    openai.generateCategory.mockResolvedValue('Technical Trade-offs');
    process.argv = process.argv.filter(arg => arg !== '--write');
    await import('../scripts/migrate-categories.js');
    expect(save).not.toHaveBeenCalled();
    expect(exps[0].metadata.category).toBeUndefined();
  });
}); 