import type { AuthUser } from '../rpc';
import type {
  LoginInput,
  LoginResult,
  RegisterOwnerInput,
  ResolveSessionInput,
  RevokeSessionInput,
} from './auth.schema';
import type {
  CashierListResult,
  CashierSummary,
  CreateCashierInput,
  SetCashierActiveInput,
} from './staff.schema';

/**
 * Single source of truth for every pattern the core service answers.
 * Adding a handler without adding it here is a compile error at the gateway.
 */
export interface CoreContract {
  'core.auth.registerOwner': { request: RegisterOwnerInput; response: LoginResult };
  'core.auth.login': { request: LoginInput; response: LoginResult };
  'core.auth.resolveSession': { request: ResolveSessionInput; response: AuthUser };
  'core.auth.revokeSession': { request: RevokeSessionInput; response: { revoked: boolean } };
  'core.staff.listCashiers': { request: Record<string, never>; response: CashierListResult };
  'core.staff.createCashier': { request: CreateCashierInput; response: CashierSummary };
  'core.staff.setCashierActive': { request: SetCashierActiveInput; response: CashierSummary };
}

export type CorePattern = keyof CoreContract;
export type CoreRequest<P extends CorePattern> = CoreContract[P]['request'];
export type CoreResponse<P extends CorePattern> = CoreContract[P]['response'];
