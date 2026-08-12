
export const StaffErrorCode = {
    CASHIER_NOT_FOUND: 'CASHIER_NOT_FOUND',
} as const;

export type StaffErrorCode = (typeof StaffErrorCode)[keyof typeof StaffErrorCode]