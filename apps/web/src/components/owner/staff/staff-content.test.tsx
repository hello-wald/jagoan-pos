import { describe, expect, it } from 'vitest';
import { StaffContent, StaffView } from './staff-content';

describe('StaffContent', () => {
  it('exports StaffContent identical to StaffView', () => {
    expect(StaffContent).toBe(StaffView);
  });
});
