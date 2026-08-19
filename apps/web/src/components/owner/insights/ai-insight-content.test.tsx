import { describe, expect, it } from 'vitest';
import {
  AiInsightContent,
  AiInsightView,
} from './ai-insight-content';

describe('AiInsightContent', () => {
  it('exports AiInsightContent identical to AiInsightView', () => {
    expect(AiInsightContent).toBe(AiInsightView);
  });
});
