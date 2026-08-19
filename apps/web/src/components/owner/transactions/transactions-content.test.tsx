import { describe, expect, it } from 'vitest';
import {
  TransactionsContent,
  TransactionsView,
} from './transactions-content';

describe('TransactionsContent', () => {
  it('exports TransactionsContent identical to TransactionsView', () => {
    expect(TransactionsContent).toBe(TransactionsView);
  });
});
