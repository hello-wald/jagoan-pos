import type { UserSummary } from '../rpc';
import type { LoginInput, LoginResult, RegisterOwnerInput } from './auth.schema';
import type { CashierListResult, CreateCashierInput, SetCashierActiveInput } from './staff.schema';

/**
 * Every pattern the core service answers. The gateway's typed send() resolves
 * request and response types from here, so a drifting payload is a build error.
 */
export interface CoreContract {
  'auth.register': { request: RegisterOwnerInput; response: UserSummary };
  'auth.login': { request: LoginInput; response: LoginResult };
  'auth.getUserById': { request: { userId: string }; response: UserSummary };
  'staff.getCashiers': { request: { merchantId: string }; response: CashierListResult };
  'staff.createCashier': {
    request: { merchantId: string; dto: CreateCashierInput };
    response: UserSummary;
  };
  'staff.setCashierActive': {
    request: { merchantId: string; cashierId: string; dto: SetCashierActiveInput };
    response: UserSummary;
  };
}

export type CorePattern = keyof CoreContract;
export type CoreRequest<P extends CorePattern> = CoreContract[P]['request'];
export type CoreResponse<P extends CorePattern> = CoreContract[P]['response'];
