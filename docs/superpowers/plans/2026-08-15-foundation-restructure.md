# Foundation & Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the monorepo onto a clean, consistent service layout with true database-per-service isolation, and migrate the existing auth/staff code onto it so FRD epic E1 works end-to-end.

**Architecture:** Six workspaces under `apps/` (one HTTP gateway, four NestJS TCP microservices, one Next.js app deferred) and three under `packages/`. The gateway is the only HTTP surface; services speak TCP `@MessagePattern` only. Every RPC carries an `RpcEnvelope<T>` whose `meta.actor` is derived server-side from the JWT, so a client can never assert its own `merchantId`. Each service owns a physically separate Postgres database, its own `schema.prisma`, and its own migration history — no cross-service joins are expressible. Redis holds session state and read caches; it is a fast path, never the source of truth.

**Tech Stack:** Node 22, NestJS 11, TypeScript 5.7 (`strict: true`), Prisma 7.9 with `@prisma/adapter-pg`, Zod 4.4 (`nestjs-zod`), ioredis 5, argon2, Postgres 17, Docker Compose, GitHub Actions.

**Spec:** [`docs/FRD.md`](../../FRD.md)

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node** `>=22.0.0`. **npm** workspaces (no pnpm/yarn). Lockfile is `package-lock.json`.
- **TypeScript** `^5.7.3`, `module`/`moduleResolution`: `commonjs`/`node`, `target` `ES2023`, `strict: true`. No `any` without an inline `// eslint-disable-next-line` and a reason.
- **NestJS** `^11`. **Prisma** `^7.9.1`. **Zod** `^4.4.3`. **ioredis** `^5.4.1`. **argon2** `^0.45.1`.
- **Package scope is `@jagoan-pos/*`** — matches the `jagoan-pos` repository.
- **Workspace name === directory name.** `apps/core` → `@jagoan-pos/core`. `apps/products` → `@jagoan-pos/products`. No `-service` suffix anywhere.
- **Validation is Zod only.** Joi must not appear in any `package.json` after Task 1.
- **Message patterns** are `<service>.<module>.<action>`, e.g. `core.auth.login`. Declared only in `packages/contracts`.
- **Every RPC payload is `RpcEnvelope<T>`.** No bare payloads, no ad-hoc `{ merchantId, dto }` shapes.
- **Tenant scoping lives in repositories, never controllers** (FRD AR-2). A repository method that touches merchant-owned rows takes `merchantId` as its first parameter and injects it into every `where`.
- **Cross-merchant access returns `NOT_FOUND`, never `FORBIDDEN`** (FRD AR-3).
- **No service imports another service's `prisma/` or `src/`.** The only shared code is `packages/*`.
- **`packages/shared` must not import `packages/contracts`.** Contracts may not import shared. Both may be imported by apps.
- **`packages/contracts` must stay browser-safe** — Zod is its only dependency, and it may never import `@nestjs/*`, `node:*`, or read `process.env`. It is shared with the Next.js frontend, which validates forms against the same schemas the server enforces and types its fetch responses from the same package. It ships dual CJS/ESM output for that reason.
- **Zod major version must match between backend and frontend.** A v3 frontend against v4 schemas fails at runtime, not at build.
- **Commit after every task.** Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
- **Commit messages carry no trailers.** No `Co-Authored-By`, no `Generated with`, no tool attribution of any kind. Subject line, and a body only when it earns its place.
- **Renames use `git mv`**, never delete-then-recreate. A rename recorded as a delete plus an add loses `git log --follow` and `git blame` across the boundary.

## Explicitly out of scope for this plan

Named here so nobody assumes they were forgotten:

- **`apps/web` (Next.js).** Deploys to Vercel independently and has no bearing on the backend restructure. Scaffolding it empty would be dead code. It gets its own plan.
- **`apps/ai-analytics` (Python worker).** Belongs with FRD E6.
- **`infra/debezium/`.** Belongs with FRD E5/E6 once there is a transaction stream to capture.
- **Catalog, checkout, inventory, reports, insights (FRD E2–E7).** Their services are scaffolded to a bootable health-check state here; domain logic lands in later plans.
- **`packages/auth`** from the original sketch. Only the gateway terminates HTTP auth, so guards live in `apps/api-gateway/src/common/`; `JwtPayload`/`Actor`/`AuthUser` types live in `contracts`. A package with one consumer is indirection, not sharing.
- **`core/src/roles/`** from the original sketch. `Role` is a three-value Prisma enum.

---

## File Structure

### Final layout after this plan

```
jagoan-pos/
├── package.json                     # workspaces: apps/*, packages/*
├── tsconfig.base.json               # single source of compiler truth
├── eslint.config.mjs                # single root flat config
├── .prettierrc
├── docker-compose.yml               # redis + 5 node services (databases are in Supabase)
├── .env.example                     # compose-level vars only
├── .github/workflows/ci.yml
├── docs/FRD.md                      # now tracked
├── apps/
│   ├── api-gateway/                 # HTTP + Swagger; the only public surface
│   ├── core/                        # auth, sessions, users, merchants
│   ├── products/                    # catalog only (global, admin-owned, cached)
│   ├── transactions/                # transactions + stock records + stock movements
│   └── reports/                     # pre-aggregated merchant rollups
└── packages/
    ├── contracts/                   # RPC envelope, message patterns, wire schemas, error codes
    ├── shared/                      # env validation, logger, cache keys
    └── redis/                       # ioredis client + cache interceptor
```

`apps/analytics-service` is deleted (Task 13). `apps/products-service` becomes `apps/products` (Task 13).

### Why stock lives in `transactions`, not `products`

FRD US-3.2 requires stock to decrement "atomically in the same commit" as the transaction, and §7.1 says that commit runs "against the transactional store." With database-per-service, an `inventory.consumer.ts` in `products` reacting to a `TransactionCreated` event cannot satisfy that — it is eventually consistent, it is lossy over plain TCP, and it makes oversell reachable.

The split that does satisfy it follows the FRD's own **[AP]** axis:

| Service | Owns | Access pattern |
| --- | --- | --- |
| `products` | catalog items, categories, prices | global, admin-written, read by every cashier → cache aggressively |
| `transactions` | transactions, transaction lines, stock records, stock movements | per-merchant, contended writes → keep the commit narrow |

This deletes `inventory.consumer.ts` entirely. No distributed transaction, no outbox, no reconciliation job.

### Responsibility of each file created here

| File | Responsibility |
| --- | --- |
| `packages/contracts/src/rpc.ts` | `RpcEnvelope`, `RpcMeta`, `Actor` — the shape every RPC uses |
| `packages/contracts/src/errors.ts` | `AppErrorCode` union + `RpcErrorShape` |
| `packages/contracts/src/core/core.contract.ts` | `CoreContract` map binding pattern → request/response types |
| `packages/contracts/src/core/auth.schema.ts` | Zod schemas for register/login/session |
| `packages/contracts/src/core/staff.schema.ts` | Zod schemas for cashier CRUD |
| `packages/shared/src/config/validate-env.ts` | `validateEnv(schema)` for `ConfigModule` |
| `packages/shared/src/logger/logger.config.ts` | one pino config used by all five apps |
| `packages/shared/src/cache/cache-keys.ts` | every Redis key in one place |
| `packages/redis/src/redis.service.ts` | ioredis wrapper: `get`/`set`/`del`/`incrWithTtl`/`sadd`/`smembers` |
| `apps/core/src/sessions/session.service.ts` | issue, resolve, revoke sessions (US-1.2, AR-5) |
| `apps/core/src/staff/staff.repository.ts` | the AR-2 enforcement point for merchant-scoped user rows |
| `apps/api-gateway/src/clients/typed.client.ts` | envelope construction + `Observable` → `Promise` + typing |
| `apps/api-gateway/src/common/guards/jwt-auth.guard.ts` | resolves session from Redis, falls back to core RPC |

---

## Task 1: Repo hygiene and shared toolchain baseline

Nothing else can be reviewed until `docs/` is tracked and there is one compiler config instead of five.

**Files:**
- Modify: `.gitignore`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc`
- Modify: `package.json`
- Delete: `apps/*/eslint.config.mjs`, `apps/*/.prettierrc`, `apps/*/.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `tsconfig.base.json` — every app and package `extends` it. Root scripts `build:packages`, `lint`, `typecheck`, `test`.

- [ ] **Step 1: Verify `docs/` is currently ignored**

Run: `git check-ignore -v docs/FRD.md`
Expected: prints `.gitignore:5:docs/	docs/FRD.md` — this is the bug.

- [ ] **Step 2: Fix `.gitignore`**

Replace the whole file with:

```gitignore
node_modules
.DS_Store

# Env files — every service has its own; none are tracked
.env
.env.local
apps/*/.env

# Build output
**/dist/
**/generated/
*.tsbuildinfo

# AI tooling
.agents/
.claude/
.windsurf/
skills-lock.json
```

- [ ] **Step 3: Verify docs are now tracked**

Run: `git check-ignore -v docs/FRD.md; echo "exit=$?"`
Expected: no output, `exit=1` (nothing matched — the file is trackable).

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "ES2023",
    "lib": ["ES2023"],
    "declaration": true,
    "sourceMap": true,
    "incremental": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "dist"]
}
```

Note the change from the current per-app configs: `strict: true` replaces `noImplicitAny: false` and `strictBindCallApply: false`. Task 6 fixes the resulting errors in `core`.

Every `apps/*/tsconfig.json` and `packages/*/tsconfig.json` in this plan extends this file. Nothing in TypeScript enforces that — `nest new` scaffolds a standalone config — so Task 15 adds a CI check that fails the build when a workspace config does not extend it.

- [ ] **Step 5: Create root `eslint.config.mjs`**

```js
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/generated/**', '**/node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
```

- [ ] **Step 6: Create root `.prettierrc`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

- [ ] **Step 7: Delete the five duplicated per-app configs**

```bash
rm -f apps/*/eslint.config.mjs apps/*/.prettierrc apps/*/.gitignore
```

- [ ] **Step 8: Rewrite root `package.json`**

```json
{
  "name": "jagoan-pos",
  "version": "1.0.0",
  "private": true,
  "license": "UNLICENSED",
  "engines": { "node": ">=22.0.0" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build:packages": "npm run build --workspace=@jagoan-pos/contracts --workspace=@jagoan-pos/shared --workspace=@jagoan-pos/redis",
    "build": "npm run build:packages && npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint .",
    "format": "prettier --write \"{apps,packages}/**/*.ts\"",
    "test": "npm run test --workspaces --if-present"
  },
  "devDependencies": {
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "prettier": "^3.4.2",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "repository": { "type": "git", "url": "git+https://github.com/SEA18-Team4/app-k.git" }
}
```

- [ ] **Step 9: Install and verify lint runs**

```bash
npm install && npx eslint --version && npx prettier --check .prettierrc
```
Expected: eslint prints a 9.x version; prettier reports the file is formatted.

- [ ] **Step 10: Commit**

```bash
git add .gitignore tsconfig.base.json eslint.config.mjs .prettierrc package.json package-lock.json docs/
git add -u apps/
git commit -m "chore: track docs, centralize tsconfig/eslint/prettier at repo root"
```

---

## Task 2: `packages/contracts` — RPC envelope, errors, and the core contract

This is the wire. Every later task depends on it, so it lands first and fully typed.

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/rpc.ts`
- Create: `packages/contracts/src/errors.ts`
- Create: `packages/contracts/src/core/auth.schema.ts`
- Create: `packages/contracts/src/core/staff.schema.ts`
- Create: `packages/contracts/src/core/core.contract.ts`
- Test: `packages/contracts/src/core/auth.schema.spec.ts`

**Interfaces:**
- Consumes: nothing (zod only).
- Produces:
  - `type Actor = { userId: string; role: UserRole; merchantId: string | null }`
  - `type RpcMeta = { correlationId: string; actor: Actor | null }`
  - `type RpcEnvelope<T> = { meta: RpcMeta; data: T }`
  - `const AppErrorCode`, `type RpcErrorShape = { code: AppErrorCode; message: string }`
  - `registerOwnerSchema`, `loginSchema`, `createCashierSchema`, `setCashierActiveSchema`, `revokeSessionSchema`, `resolveSessionSchema`
  - `type RegisterOwnerInput`, `LoginInput`, `LoginResult`, `AuthUser`, `UserRole`, `JwtPayload`, `CreateCashierInput`, `SetCashierActiveInput`, `CashierListResult`
  - `interface CoreContract` keyed by literal pattern strings; `type CorePattern = keyof CoreContract`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/src/core/auth.schema.spec.ts`:

```ts
import { loginSchema, registerOwnerSchema } from './auth.schema';

describe('registerOwnerSchema', () => {
  it('normalizes email to trimmed lowercase', () => {
    const parsed = registerOwnerSchema.parse({
      merchantName: 'Warung Bu Tini',
      fullName: 'Bu Tini',
      email: '  BuTini@Example.COM ',
      password: 'correct-horse',
    });
    expect(parsed.email).toBe('butini@example.com');
  });

  it('rejects a malformed email', () => {
    expect(() =>
      registerOwnerSchema.parse({
        merchantName: 'W',
        fullName: 'B',
        email: 'not-an-email',
        password: 'correct-horse',
      }),
    ).toThrow();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() =>
      registerOwnerSchema.parse({
        merchantName: 'W',
        fullName: 'B',
        email: 'a@b.com',
        password: 'short',
      }),
    ).toThrow();
  });
});

describe('loginSchema', () => {
  // Regression: login must not re-apply the registration password policy.
  // A tightened policy would otherwise lock out every existing user.
  it('accepts a password that violates the registration policy', () => {
    const parsed = loginSchema.parse({ email: 'a@b.com', password: 'x' });
    expect(parsed.password).toBe('x');
  });

  it('rejects an empty password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/contracts`
Expected: FAIL — the workspace does not exist yet (`npm ERR! No workspaces found`).

- [ ] **Step 3: Create the package manifest**

`packages/contracts/package.json`:

```json
{
  "name": "@jagoan-pos/contracts",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/cjs/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/cjs/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsc -p tsconfig.esm.json && node -e \"require('fs').writeFileSync('dist/esm/package.json', JSON.stringify({type:'module'}))\"",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest"
  },
  "dependencies": { "zod": "^4.4.3" },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist/cjs", "rootDir": "./src" },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "dist"]
}
```

`packages/contracts/tsconfig.esm.json` — the second output, so Next.js on Vercel can tree-shake the package:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "outDir": "./dist/esm",
    "declaration": false
  }
}
```

The build writes `dist/esm/package.json` containing `{"type":"module"}`, because the repo root is CommonJS and Node would otherwise read those `.js` files as CJS.

- [ ] **Step 4: Write `src/rpc.ts`**

```ts
import { z } from 'zod';

export const userRoleSchema = z.enum(['GLOBAL_ADMIN', 'OWNER', 'CASHIER']);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * The authenticated caller, derived server-side from the JWT by the gateway.
 * Services read tenant scope from here and never from client-supplied fields
 * (FRD AR-1, AR-2).
 */
export const actorSchema = z.object({
  userId: z.uuid(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});
export type Actor = z.infer<typeof actorSchema>;

export interface RpcMeta {
  correlationId: string;
  actor: Actor | null;
}

export interface RpcEnvelope<T> {
  meta: RpcMeta;
  data: T;
}

export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  jti: z.uuid(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

export type AuthUser = {
  id: string;
  merchantId: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};
```

- [ ] **Step 5: Write `src/errors.ts`**

```ts
export const AppErrorCode = {
  // auth
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  SESSION_REVOKED: 'SESSION_REVOKED',
  // staff
  CASHIER_NOT_FOUND: 'CASHIER_NOT_FOUND',
  // generic
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/** The only payload shape an RpcException may carry. */
export interface RpcErrorShape {
  code: AppErrorCode;
  message: string;
}
```

- [ ] **Step 6: Write `src/core/auth.schema.ts`**

```ts
import { z } from 'zod';
import { userRoleSchema } from '../rpc';

const nameSchema = z.string().trim().min(1).max(150);

/** Trim and lowercase first, then validate — so " A@B.com " is accepted and normalized. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

/** Registration policy. Deliberately NOT reused by loginSchema. */
const newPasswordSchema = z.string().min(8).max(128);

export const registerOwnerSchema = z.object({
  merchantName: nameSchema,
  fullName: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Any non-empty string. Tightening the registration policy must never
  // lock out an existing user (FRD US-1.1).
  password: z.string().min(1),
});

export const resolveSessionSchema = z.object({ jti: z.uuid(), userId: z.uuid() });
export const revokeSessionSchema = z.object({ jti: z.uuid() });

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResolveSessionInput = z.infer<typeof resolveSessionSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

export type LoginResult = {
  accessToken: string;
  user: {
    id: string;
    merchantId: string | null;
    fullName: string;
    email: string;
    role: z.infer<typeof userRoleSchema>;
    isActive: boolean;
  };
};
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm install && npm test --workspace=@jagoan-pos/contracts`
Expected: PASS, 5 tests.

If `z.email` is not exported by the installed Zod, substitute `z.string().email('Invalid email address')` for the piped form and re-run — the tests are the arbiter.

- [ ] **Step 8: Write `src/core/staff.schema.ts`**

```ts
import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const createCashierSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const setCashierActiveSchema = z.object({
  cashierId: z.uuid(),
  isActive: z.boolean(),
});

export type CreateCashierInput = z.infer<typeof createCashierSchema>;
export type SetCashierActiveInput = z.infer<typeof setCashierActiveSchema>;

export type CashierSummary = {
  id: string;
  merchantId: string | null;
  fullName: string;
  email: string;
  role: 'CASHIER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashierListResult = {
  data: CashierSummary[];
  summary: { total: number; active: number; inactive: number };
};
```

Note `setCashierActiveSchema` now carries `cashierId`. The current code passes it as a separate `@Payload('cashierId')` argument; folding it into the validated body means one schema validates the whole request.

- [ ] **Step 9: Write `src/core/core.contract.ts`**

```ts
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
```

`listCashiers` takes `Record<string, never>` — an empty body. The merchant comes from `meta.actor.merchantId`, which is exactly the point.

- [ ] **Step 10: Write `src/index.ts`**

```ts
export * from './rpc';
export * from './errors';
export * from './core/auth.schema';
export * from './core/staff.schema';
export * from './core/core.contract';
```

- [ ] **Step 11: Verify the package builds and tests pass**

```bash
npm run build --workspace=@jagoan-pos/contracts && npm test --workspace=@jagoan-pos/contracts
ls packages/contracts/dist/cjs/index.js packages/contracts/dist/esm/index.js packages/contracts/dist/esm/package.json
```
Expected: 5 tests pass; all three files listed.

- [ ] **Step 12: Verify the package is browser-safe**

This package is shared with the Next.js frontend, so a single `@nestjs/*` import would break the Vercel build and drag server code into a public bundle.

```bash
grep -rn "@nestjs/\|node:\|process\.env" packages/contracts/src; echo "exit=$?"
```
Expected: no output, `exit=1`.

Then confirm the ESM output is genuinely importable and that nothing server-side survived erasure:

```bash
node --input-type=module -e "
  import { loginSchema, AppErrorCode } from './packages/contracts/dist/esm/index.js';
  console.log(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success);
  console.log(Object.keys(AppErrorCode).length);
"
```
Expected: `true`, then `9`.

The message-pattern strings never appear in this output: `CoreContract` is a TypeScript `interface`, so it is erased at compile time and contributes nothing to the frontend bundle. That is why the whole package can be shared rather than split into public and private halves.

- [ ] **Step 13: Commit**

```bash
git add packages/contracts package.json package-lock.json
git commit -m "feat(contracts): add rpc envelope, error codes, and typed core contract"
```

---

## Task 3: `packages/shared` — env validation, logger, cache keys

**Files:**
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/config/validate-env.ts`
- Create: `packages/shared/src/logger/logger.config.ts`
- Create: `packages/shared/src/cache/cache-keys.ts`
- Modify: `packages/shared/src/index.ts`
- Delete: `packages/shared/src/auth/`, `packages/shared/src/staff/`, `packages/shared/src/cache/cache-key.ts`
- Test: `packages/shared/src/config/validate-env.spec.ts`

The auth/staff schemas and error codes move to `contracts` (Task 2). What remains in `shared` is mechanism, not wire format — which is the rule that keeps it from becoming a junk drawer.

**Interfaces:**
- Consumes: nothing. **Must not import `@jagoan-pos/contracts`.**
- Produces:
  - `validateEnv<T extends ZodType>(schema: T): (raw: Record<string, unknown>) => z.infer<T>`
  - `buildLoggerOptions(serviceName: string): Params` for `nestjs-pino`
  - `cacheKeys` — every Redis key used anywhere

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/config/validate-env.spec.ts`:

```ts
import { z } from 'zod';
import { validateEnv } from './validate-env';

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  DATABASE_URL: z.string().min(1),
});

describe('validateEnv', () => {
  it('coerces and returns the parsed config', () => {
    const parsed = validateEnv(schema)({ PORT: '4002', DATABASE_URL: 'postgres://x' });
    expect(parsed).toEqual({ PORT: 4002, DATABASE_URL: 'postgres://x' });
  });

  it('applies defaults for absent optional vars', () => {
    const parsed = validateEnv(schema)({ DATABASE_URL: 'postgres://x' });
    expect(parsed.PORT).toBe(4001);
  });

  it('throws naming every missing variable', () => {
    expect(() => validateEnv(schema)({})).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/shared`
Expected: FAIL — `Cannot find module './validate-env'`.

- [ ] **Step 3: Write `src/config/validate-env.ts`**

```ts
import type { ZodType, z } from 'zod';

/**
 * Adapter between Zod and Nest's ConfigModule `validate` hook.
 * Fails loudly at boot rather than at first use of a missing variable.
 */
export function validateEnv<T extends ZodType>(schema: T) {
  return (raw: Record<string, unknown>): z.infer<T> => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${detail}`);
    }
    return result.data;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/shared`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write `src/logger/logger.config.ts`**

```ts
import type { Params } from 'nestjs-pino';

/**
 * One logging configuration for all five apps. Pretty in dev, JSON in prod.
 * `correlationId` is bound per-request by the gateway middleware and forwarded
 * to services in RpcMeta.
 */
export function buildLoggerOptions(serviceName: string): Params {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      autoLogging: !isProd ? false : true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.password',
          '*.password',
          '*.passwordHash',
          '*.accessToken',
        ],
        censor: '[redacted]',
      },
      transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } },
    },
  };
}
```

The `redact` list is the point: without it, `password` and `accessToken` land in production logs on every validation error.

- [ ] **Step 6: Write `src/cache/cache-keys.ts`**

```ts
const PREFIX = 'appk';

export const cacheKeys = {
  /** Session state: JSON AuthUser, or the literal string "revoked". */
  session: (jti: string) => `${PREFIX}:sess:${jti}`,
  /** Set of live jtis for a user, so deactivation can revoke them all (FRD AR-5). */
  userSessions: (userId: string) => `${PREFIX}:usess:${userId}`,
  /** Failed-login counter, 15-minute window (FRD US-1.1). */
  loginAttempts: (email: string) => `${PREFIX}:login-attempts:${email}`,
  /** Cashier list per merchant. */
  cashiers: (merchantId: string) => `${PREFIX}:core:cashiers:${merchantId}`,
} as const;
```

- [ ] **Step 7: Replace `src/index.ts` and delete the moved files**

```ts
export * from './config/validate-env';
export * from './logger/logger.config';
export * from './cache/cache-keys';
```

```bash
rm -rf packages/shared/src/auth packages/shared/src/staff packages/shared/src/cache/cache-key.ts
```

- [ ] **Step 8: Update the manifest and tsconfig**

`packages/shared/package.json`:

```json
{
  "name": "@jagoan-pos/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "nestjs-pino": "^4.4.0",
    "pino-http": "^10.4.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "jest": "^30.0.0",
    "pino-pretty": "^13.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

`packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "dist"]
}
```

- [ ] **Step 9: Verify build and tests**

```bash
npm install && npm run build --workspace=@jagoan-pos/shared && npm test --workspace=@jagoan-pos/shared
```
Expected: build emits `dist/`; 3 tests pass.

- [ ] **Step 10: Verify the layering rule holds**

Run: `grep -rn "@jagoan-pos/contracts" packages/shared/src; echo "exit=$?"`
Expected: no output, `exit=1`. `shared` must never import `contracts`.

- [ ] **Step 11: Commit**

```bash
git add packages/shared package.json package-lock.json
git commit -m "refactor(shared): reduce to env validation, logging, and cache keys"
```

---

## Task 4: `packages/redis` — migrate to ioredis and fix the logging bug

Upstash's REST client cannot talk to a local Redis container, so dev and prod would run different clients. ioredis speaks both (`redis://` locally, `rediss://` to Upstash TCP) and avoids an HTTP round trip per operation on a long-lived VM process.

**Files:**
- Modify: `packages/redis/package.json`
- Modify: `packages/redis/tsconfig.json`
- Modify: `packages/redis/src/redis.service.ts`
- Modify: `packages/redis/src/redis.module.ts`
- Modify: `packages/redis/src/interceptors/redis-cache.interceptor.ts`
- Create: `packages/redis/src/index.ts` (verify exports)
- Test: `packages/redis/src/redis.service.spec.ts`

**Interfaces:**
- Consumes: `ConfigService` (`REDIS_URL`).
- Produces: `RedisService` with `get<T>(key)`, `set(key, value, ttlSeconds)`, `setRaw(key, value, ttlSeconds)`, `del(...keys)`, `incrWithTtl(key, ttlSeconds)`, `sadd(key, member, ttlSeconds)`, `smembers(key)`. Plus `RedisModule`, `RedisCacheInterceptor`, `Cacheable`.

- [ ] **Step 1: Write the failing test**

Create `packages/redis/src/redis.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService, REDIS_CLIENT } from './redis.service';

const client = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: client },
        { provide: ConfigService, useValue: { getOrThrow: () => 'redis://localhost:6379' } },
      ],
    }).compile();
    service = moduleRef.get(RedisService);
  });

  it('round-trips a JSON value', async () => {
    client.get.mockResolvedValue('{"a":1}');
    await expect(service.get<{ a: number }>('k')).resolves.toEqual({ a: 1 });
  });

  it('returns null on a miss', async () => {
    client.get.mockResolvedValue(null);
    await expect(service.get('k')).resolves.toBeNull();
  });

  // Cache must never take the caller down.
  it('returns null instead of throwing when Redis is unreachable', async () => {
    client.get.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.get('k')).resolves.toBeNull();
  });

  it('writes JSON with an EX ttl', async () => {
    await service.set('k', { a: 1 }, 60);
    expect(client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 60);
  });

  // Regression: incrWithTtl must only set the expiry on the first increment,
  // otherwise the 15-minute lockout window slides forever and never lapses.
  it('sets the ttl only on the first increment', async () => {
    client.incr.mockResolvedValueOnce(1);
    await service.incrWithTtl('k', 900);
    expect(client.expire).toHaveBeenCalledWith('k', 900);

    client.incr.mockResolvedValueOnce(2);
    client.expire.mockClear();
    await service.incrWithTtl('k', 900);
    expect(client.expire).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/redis`
Expected: FAIL — `REDIS_CLIENT` is not exported and `incrWithTtl` does not exist.

- [ ] **Step 3: Rewrite `src/redis.service.ts`**

```ts
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.warn('GET', key, error);
      return null;
    }
  }

  /** Reads a value written by `setRaw` — no JSON parsing. */
  async getRaw(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.warn('GET', key, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.warn('SET', key, error);
    }
  }

  /** Writes a bare string, preserving the existing ttl when `keepTtl` is set. */
  async setRaw(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds === undefined) {
        await this.client.set(key, value, 'KEEPTTL');
      } else {
        await this.client.set(key, value, 'EX', ttlSeconds);
      }
    } catch (error) {
      this.warn('SET', key, error);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.warn('DEL', keys.join(','), error);
    }
  }

  /**
   * Increments a counter and sets its expiry only on first write, so the
   * window is fixed rather than sliding. Returns the new count, or 0 if
   * Redis is unreachable (fail-open — a cache outage must not lock users out).
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, ttlSeconds);
      return count;
    } catch (error) {
      this.warn('INCR', key, error);
      return 0;
    }
  }

  async sadd(key: string, member: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.sadd(key, member);
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.warn('SADD', key, error);
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.warn('SMEMBERS', key, error);
      return [];
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  private warn(op: string, key: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis ${op} failed for key "${key}": ${message}`);
  }
}
```

The per-operation `op` label fixes the copy-paste bug where `set` and `del` failures both logged `"Redis GET failed"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/redis`
Expected: PASS, 5 tests.

- [ ] **Step 5: Rewrite `src/redis.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';
import { RedisCacheInterceptor } from './interceptors/redis-cache.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: 2,
          // Fail fast instead of buffering commands while disconnected —
          // the cache must degrade, not queue up latency on the hot path.
          enableOfflineQueue: false,
          lazyConnect: false,
        }),
    },
    RedisService,
    RedisCacheInterceptor,
  ],
  exports: [RedisService, RedisCacheInterceptor],
})
export class RedisModule {}
```

- [ ] **Step 6: Simplify the cache interceptor's key resolution**

Replace `src/interceptors/redis-cache.interceptor.ts`:

```ts
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, of, switchMap } from 'rxjs';
import { RedisService } from '../redis.service';
import { CACHEABLE_KEY, type CacheableOptions } from '../decorator/cacheable.decorator';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const options = this.reflector.get<CacheableOptions | undefined>(
      CACHEABLE_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const key = options.key(context);
    if (!key) return next.handle();

    const ttlSeconds = options.ttlSeconds ?? 300;
    const cached = await this.redis.get(key);
    if (cached !== null) {
      this.logger.debug(`cache hit ${key}`);
      return of(cached);
    }

    return next.handle().pipe(
      switchMap(async (response: unknown) => {
        if (response !== undefined && response !== null) {
          await this.redis.set(key, response, ttlSeconds);
        }
        return response;
      }),
    );
  }
}
```

- [ ] **Step 7: Update the manifest**

Replace the `@upstash/redis` dependency with `ioredis`:

```json
{
  "name": "@jagoan-pos/redis",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "ioredis": "^5.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.0.1",
    "@types/jest": "^30.0.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

`packages/redis/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "dist"]
}
```

`packages/redis/src/index.ts`:

```ts
export * from './redis.module';
export * from './redis.service';
export * from './interceptors/redis-cache.interceptor';
export * from './decorator/cacheable.decorator';
```

- [ ] **Step 8: Verify no Upstash REST references remain**

```bash
npm install
grep -rn "UPSTASH_REDIS_REST\|@upstash/redis" --include="*.ts" --include="*.json" apps packages; echo "exit=$?"
```
Expected: only hits inside `apps/core/src/app.module.ts` (removed in Task 6). Once Task 6 lands, `exit=1`.

- [ ] **Step 9: Verify build and full package test suite**

```bash
npm run build:packages && npm test --workspace=@jagoan-pos/redis
```
Expected: three packages build; 6 tests pass (5 service + 1 existing interceptor spec).

- [ ] **Step 10: Commit**

```bash
git add packages/redis package.json package-lock.json
git commit -m "refactor(redis): swap upstash rest client for ioredis, fix op labels in error logs"
```

---

## Task 5: Supabase databases and local Redis

There is no local Postgres. Dev, CI, and production all target Supabase, so the four-database decision has to be made now rather than at deploy time.

The committed `docker-compose.yml` is dead regardless: it builds `infra/docker/Dockerfile.nest` and mounts `./infra/clickhouse/init`, neither of which exists, and references workspaces `@app/api`, `@app/insight-api`, `@app/outbox-relay`, `@app/analytics-worker`, none of which exist. It fails on `docker compose up` today. It is replaced with Redis only.

### Choosing how the four databases are hosted

Supabase's connection pooler (Supavisor) routes to a project's **default** database. That single fact decides this:

| Route | Shape | Consequence |
| --- | --- | --- |
| **A — four projects** (recommended) | one Supabase project per service, each using its project's default `postgres` database | all four services get pooled connections; four dashboards; four sets of credentials; cost scales with project count |
| **B — one project, four databases** | `CREATE DATABASE` for products/transactions/reports inside one project | only the default database is reachable through the pooler. The other three must use **direct** connections, which have a much lower ceiling — set `*_DATABASE_POOL_MAX` to 3 and check your plan's connection limit before starting |

Pick before Step 1. The application code is identical either way; only the eight connection strings differ.

**Files:**
- Replace: `docker-compose.yml`
- Replace: `.env.example`
- Delete: `infra/` is not created in this plan

**Interfaces:**
- Consumes: nothing.
- Produces: Redis on `localhost:6379`. Four reachable Postgres databases with two connection strings each — `<SERVICE>_DATABASE_URL` (pooled, port 6543, used at runtime) and `<SERVICE>_DIRECT_URL` (direct, port 5432, used only by migrations).

### Why two URLs per service

Supavisor's transaction mode hands a different backend connection to each transaction, which breaks the session-scoped advisory locks Prisma Migrate takes. Migrations must therefore run on the direct connection. Runtime does not need session state and should use the pooler.

Runtime does **not** need the `?pgbouncer=true` flag, because this repo uses `@prisma/adapter-pg` (node-postgres) rather than Prisma's own query engine pooling, and `pg` issues unnamed prepared statements that transaction-mode pooling tolerates.

- [ ] **Step 1: Provision the databases**

**Route A** — create four Supabase projects named `jagoan-core`, `jagoan-products`, `jagoan-transactions`, `jagoan-reports`. Nothing further to run; each project's default `postgres` database is the service's database.

**Route B** — create one project, then from its SQL editor or a direct `psql` session:

```sql
CREATE DATABASE products_db;
CREATE DATABASE transactions_db;
CREATE DATABASE reports_db;
```

The project's default `postgres` database is `core`'s.

- [ ] **Step 2: Create a least-privilege role per database**

The point of database-per-service is that no service can read another's tables. Running all four as the `postgres` superuser makes the separation decorative.

For each database, connect to it directly and run — substituting `<service>` and a generated password:

```sql
CREATE ROLE <service>_svc LOGIN PASSWORD '<generated>';
GRANT CONNECT ON DATABASE <database> TO <service>_svc;
GRANT ALL ON SCHEMA public TO <service>_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO <service>_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO <service>_svc;
```

Store each password in your password manager. They go into `apps/*/.env`, which is gitignored (Task 1).

- [ ] **Step 3: Verify the isolation is real**

Under Route A this is guaranteed by separate projects — confirm by checking that `core_svc`'s credentials do not appear in any other project.

Under Route B, prove it. With `core_svc`'s password in `PGPASSWORD`:

```bash
psql "postgresql://core_svc@db.<ref>.supabase.co:5432/products_db?sslmode=require" -c "SELECT 1"
```
Expected: `permission denied for database products_db`. If this succeeds, `GRANT CONNECT` was applied too broadly and the boundary is nominal — fix it before continuing.

- [ ] **Step 4: Verify a pooled and a direct connection both work**

```bash
psql "postgresql://core_svc@<pooler-host>:6543/postgres?sslmode=require" -c "SELECT 'pooled ok'"
psql "postgresql://core_svc@db.<ref>.supabase.co:5432/postgres?sslmode=require" -c "SELECT 'direct ok'"
```
Expected: both print their string. If the pooled one fails under Route B for products/transactions/reports, that is the documented limitation — use the direct URL for both values on those three and lower `*_DATABASE_POOL_MAX` to 3.

- [ ] **Step 5: Replace `docker-compose.yml` with Redis only**

```yaml
name: jagoan-pos

# Databases live in Supabase. This file exists for Redis, plus the `apps`
# profile added in Task 14 for running the services in containers.

services:
  redis:
    image: redis:8-alpine
    container_name: jagoan-redis
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD:-redis_dev_password}"]
    ports:
      - "127.0.0.1:${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a $${REDIS_PASSWORD} ping | grep PONG"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

volumes:
  redis_data:
```

To use Upstash in dev instead of this container, point `REDIS_URL` at your `rediss://` endpoint and skip `docker compose up` — ioredis speaks both, which is why Task 4 moved off the Upstash REST client.

- [ ] **Step 6: Replace `.env.example`**

This file holds only what Compose reads. Per-service application config lives in `apps/*/.env`.

```dotenv
# ---- Docker Compose only ----
REDIS_PASSWORD=redis_dev_password
REDIS_PORT=6379
```

- [ ] **Step 7: Verify Redis responds**

```bash
cp .env.example .env
docker compose up -d
docker compose exec -T redis redis-cli -a redis_dev_password ping
```
Expected: `PONG`.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore(infra): replace stale compose file with redis only; databases move to supabase"
```

---

## Task 6: `apps/core` — normalize the service skeleton

This task establishes the template that Tasks 10 and 13 replicate. It removes the Nest Hello-World boilerplate, moves config to per-service `.env` + Zod, fixes the `process.cwd()` env path that breaks under Docker, and turns on `strict`.

**Files:**
- Create: `apps/core/src/config/env.schema.ts`
- Create: `apps/core/.env.example`
- Modify: `apps/core/src/app.module.ts`
- Modify: `apps/core/src/main.ts`
- Modify: `apps/core/src/prisma/prisma.service.ts`
- Modify: `apps/core/package.json`
- Modify: `apps/core/tsconfig.json`
- Modify: `apps/core/prisma.config.ts`
- Delete: `apps/core/src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`, `apps/core/test/`
- Test: `apps/core/src/config/env.schema.spec.ts`

**Interfaces:**
- Consumes: `validateEnv`, `buildLoggerOptions` from `@jagoan-pos/shared`; `RedisModule` from `@jagoan-pos/redis`.
- Produces: `coreEnvSchema`, `type CoreEnv`. `PrismaService` with `$on('query')` logging and an explicit pool ceiling. A `main.ts` that boots a TCP listener and closes cleanly on `SIGTERM`.

- [ ] **Step 1: Write the failing test**

Create `apps/core/src/config/env.schema.spec.ts`:

```ts
import { coreEnvSchema } from './env.schema';

const valid = {
  CORE_HOST: '0.0.0.0',
  CORE_TCP_PORT: '4001',
  CORE_DATABASE_URL: 'postgresql://core_svc:pw@pooler.supabase.com:6543/postgres',
  CORE_DIRECT_URL: 'postgresql://core_svc:pw@db.ref.supabase.co:5432/postgres',
  CORE_DATABASE_POOL_MAX: '5',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a-secret-at-least-32-characters-long',
  JWT_EXPIRES_IN_SECONDS: '3600',
};

describe('coreEnvSchema', () => {
  it('coerces numeric vars', () => {
    const env = coreEnvSchema.parse(valid);
    expect(env.CORE_TCP_PORT).toBe(4001);
    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(3600);
  });

  // A 16-character secret is brute-forceable; the old Joi schema allowed it.
  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => coreEnvSchema.parse({ ...valid, JWT_SECRET: 'too-short' })).toThrow();
  });

  it('rejects a non-postgres database url', () => {
    expect(() => coreEnvSchema.parse({ ...valid, CORE_DATABASE_URL: 'mysql://x' })).toThrow();
  });

  it('requires REDIS_URL', () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = valid;
    expect(() => coreEnvSchema.parse(withoutRedis)).toThrow(/REDIS_URL/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/core`
Expected: FAIL — the workspace is still named `core-service` (`No workspaces found`).

- [ ] **Step 3: Write `src/config/env.schema.ts`**

```ts
import { z } from 'zod';

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORE_HOST: z.string().min(1).default('0.0.0.0'),
  CORE_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  // Pooled connection (Supavisor, port 6543). Used at runtime.
  CORE_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  // Direct connection (port 5432). Used only by Prisma Migrate, which needs
  // session-scoped advisory locks that transaction pooling breaks.
  CORE_DIRECT_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  CORE_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  REDIS_URL: z.string().min(1),
  // 32 chars is the floor for an HS256 signing key.
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).default(3600),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  LOGIN_ATTEMPT_WINDOW_SECONDS: z.coerce.number().int().min(60).default(900),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;
```

`JWT_EXPIRES_IN_SECONDS` replaces the string `JWT_EXPIRES_IN=7d`. Sessions need a numeric TTL to size the Redis expiry, and parsing `7d` in two places invites drift. A 7-day access token with no refresh token is also too long-lived; 1 hour is the new default.

- [ ] **Step 4: Rename the workspace and update the manifest**

`apps/core/package.json` — change the name and dependencies:

```json
{
  "name": "@jagoan-pos/core",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@jagoan-pos/contracts": "^0.0.1",
    "@jagoan-pos/redis": "^0.0.1",
    "@jagoan-pos/shared": "^0.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/microservices": "^11.1.28",
    "@prisma/adapter-pg": "^7.9.1",
    "@prisma/client": "^7.9.1",
    "argon2": "^0.45.1",
    "nestjs-pino": "^4.4.0",
    "nestjs-zod": "^5.5.0",
    "pg": "^8.23.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "jest": "^30.0.0",
    "prisma": "^7.9.1",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^generated/(.*)$": "<rootDir>/../generated/$1"
    }
  }
}
```

`joi`, `dotenv`, `@nestjs/platform-express`, `supertest`, and the eslint/prettier packages are all gone — a TCP microservice has no HTTP server, and lint/format now run from the root.

Note the removed `"^src/(.*)$"` mapping. Relative imports only from here on; Task 6 Step 9 enforces it.

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm install && npm test --workspace=@jagoan-pos/core -- env.schema
```
Expected: PASS, 4 tests.

- [ ] **Step 6: Point tsconfig at the base and delete the boilerplate**

`apps/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*.ts", "prisma.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```bash
rm -f apps/core/src/app.controller.ts apps/core/src/app.service.ts apps/core/src/app.controller.spec.ts
rm -rf apps/core/test apps/core/tsconfig.build.json
```

- [ ] **Step 7: Rewrite `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { resolve } from 'node:path';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { RedisModule } from '@jagoan-pos/redis';
import { coreEnvSchema } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved from __dirname, not process.cwd(). Under Docker the working
      // directory is /app while this file lives in /app/apps/core/dist, so a
      // cwd-relative path resolved to /.env and silently loaded nothing.
      envFilePath: [resolve(__dirname, '..', '.env')],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(coreEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('core')),
    PrismaModule,
    RedisModule,
    SessionsModule,
    AuthModule,
    StaffModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 8: Rewrite `src/main.ts`**

```ts
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { CoreEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const config = context.get(ConfigService<CoreEnv, true>);
  const host = config.get('CORE_HOST', { infer: true });
  const port = config.get('CORE_TCP_PORT', { infer: true });
  await context.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host, port },
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  await app.listen();
  app.get(Logger).log(`core listening on tcp://${host}:${port}`);
}

void bootstrap();
```

The global `ZodValidationPipe` is gone. Each handler validates against its own contract schema (Task 9), which gives a precise error per pattern instead of one pipe guessing at DTO metadata across every message.

- [ ] **Step 9: Rewrite `src/prisma/prisma.service.ts`**

```ts
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type { CoreEnv } from '../config/env.schema';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<CoreEnv, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('CORE_DATABASE_URL', { infer: true }),
      // Bounded so five Node processes cannot exhaust Postgres' connection
      // limit between them.
      max: config.get('CORE_DATABASE_POOL_MAX', { infer: true }),
    });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('query', (event) => {
      this.logger.debug(`${event.duration}ms ${event.query}`);
    });
    this.$on('warn', (event) => this.logger.warn(event.message));
    this.$on('error', (event) => this.logger.error(event.message));

    // Fail the boot rather than logging and continuing into a broken process.
    await this.$connect();
    this.logger.log('prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Two behaviour changes from the current version: the import is relative (`../../generated/...`) instead of the bare `generated/prisma/client` specifier that only resolved via `baseUrl`, and a failed connection now rejects instead of being swallowed by a `try/catch` that let the service come up dead.

- [ ] **Step 10: Update `prisma.config.ts` for the per-service env file**

```ts
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Direct, not pooled: migrations take session-scoped advisory locks.
  datasource: { url: process.env.CORE_DIRECT_URL },
});
```

Add `dotenv` back as a devDependency only — it is a migration-time tool, not a runtime one:

```bash
npm install --save-dev dotenv --workspace=@jagoan-pos/core
```

- [ ] **Step 11: Create `apps/core/.env.example`**

```dotenv
NODE_ENV=development

CORE_HOST=0.0.0.0
CORE_TCP_PORT=4001

# Pooled (Supavisor, 6543) for runtime; direct (5432) for migrations.
CORE_DATABASE_URL=postgresql://core_svc:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
CORE_DIRECT_URL=postgresql://core_svc:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require
CORE_DATABASE_POOL_MAX=5

REDIS_URL=redis://:redis_dev_password@localhost:6379

JWT_SECRET=replace-me-with-at-least-32-characters-of-entropy
JWT_EXPIRES_IN_SECONDS=3600

LOGIN_MAX_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW_SECONDS=900
```

- [ ] **Step 12: Verify no bare `src/` imports remain**

```bash
grep -rn "from 'src/" apps/core/src; echo "exit=$?"
```
Expected: no output, `exit=1`. (`staff.service.ts` currently has one; fix it to a relative path.)

- [ ] **Step 13: Verify the service typechecks under `strict`**

```bash
cp apps/core/.env.example apps/core/.env
npm run prisma:generate --workspace=@jagoan-pos/core
npm run typecheck --workspace=@jagoan-pos/core
```
Expected: clean. Turning on `strict` will surface errors in `auth.service.ts` and `staff.service.ts` where `noImplicitAny: false` was hiding untyped parameters — fix each by adding the real type, never by widening to `any`.

- [ ] **Step 14: Commit**

```bash
git add apps/core packages/ package.json package-lock.json
git commit -m "refactor(core): normalize service skeleton with zod env, pino, strict ts"
```

---

## Task 7: `apps/core` — session issue, resolve, and revoke

FRD US-1.2 requires a replayed token to be rejected after logout, and AR-5 requires a deactivated user's live sessions to die at the next request. Neither is possible with a stateless JWT alone, so sessions get a `jti` and a two-tier store: Redis as the fast path, Postgres as the durable record of revocation.

The durable tier is not optional. If revocation lived only in Redis, an evicted key would let the gateway fall back to core, core would find an active user row, and the revoked token would be resurrected.

**Files:**
- Modify: `apps/core/prisma/schema.prisma`
- Create: `apps/core/prisma/migrations/<timestamp>_add_revoked_tokens/migration.sql` (generated)
- Create: `apps/core/src/sessions/sessions.module.ts`
- Create: `apps/core/src/sessions/session.service.ts`
- Test: `apps/core/src/sessions/session.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `RedisService`, `JwtService`, `ConfigService<CoreEnv>`, `cacheKeys` from `@jagoan-pos/shared`, `AuthUser` from `@jagoan-pos/contracts`.
- Produces: `SessionService` with:
  - `issue(user: AuthUser): Promise<{ accessToken: string; jti: string }>`
  - `resolve(jti: string, userId: string): Promise<AuthUser>` — throws `RpcException({ code: SESSION_REVOKED | USER_NOT_FOUND | USER_INACTIVE })`
  - `revoke(jti: string): Promise<{ revoked: boolean }>`
  - `revokeAllForUser(userId: string): Promise<void>`
  - `SessionsModule` exports `SessionService`.

- [ ] **Step 1: Add the `RevokedToken` model**

Append to `apps/core/prisma/schema.prisma`:

```prisma
/// Durable revocation record. Redis is the fast path; this table is the
/// authority, so a Redis eviction cannot resurrect a logged-out token.
model RevokedToken {
  jti       String   @id @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at") @db.Timestamptz(6)
  revokedAt DateTime @default(now()) @map("revoked_at") @db.Timestamptz(6)

  @@index([expiresAt])
  @@map("revoked_tokens")
}
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run prisma:migrate --workspace=@jagoan-pos/core -- --name add_revoked_tokens
```
Expected: a new folder under `prisma/migrations/`, and `revoked_tokens` created in `core_db`.

- [ ] **Step 3: Write the failing test**

Create `apps/core/src/sessions/session.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { RedisService } from '@jagoan-pos/redis';
import { AppErrorCode, type AuthUser } from '@jagoan-pos/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const user: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  merchantId: '22222222-2222-4222-8222-222222222222',
  fullName: 'Bu Tini',
  email: 'butini@example.com',
  role: 'OWNER',
  isActive: true,
};

const redis = {
  get: jest.fn(),
  getRaw: jest.fn(),
  set: jest.fn(),
  setRaw: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
};
const prisma = {
  user: { findUnique: jest.fn() },
  revokedToken: { findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
};
const jwt = { signAsync: jest.fn() };
const config = { get: (key: string) => (key === 'JWT_EXPIRES_IN_SECONDS' ? 3600 : undefined) };

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(SessionService);
  });

  describe('issue', () => {
    it('signs a token carrying a jti and caches the session', async () => {
      jwt.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.issue(user);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, jti: result.jti, role: 'OWNER' }),
      );
      expect(redis.set).toHaveBeenCalledWith(
        `appk:sess:${result.jti}`,
        user,
        3600,
      );
      // Indexed by user so deactivation can find every live session (AR-5).
      expect(redis.sadd).toHaveBeenCalledWith(`appk:usess:${user.id}`, result.jti, 3600);
    });
  });

  describe('resolve', () => {
    it('returns the cached user without touching the database', async () => {
      redis.getRaw.mockResolvedValue(JSON.stringify(user));

      await expect(service.resolve('abc', user.id)).resolves.toEqual(user);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a session tombstoned in redis', async () => {
      redis.getRaw.mockResolvedValue('revoked');

      await expect(service.resolve('abc', user.id)).rejects.toMatchObject({
        error: { code: AppErrorCode.SESSION_REVOKED },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    // The whole reason the revoked_tokens table exists.
    it('rejects a revoked session even after the redis key is evicted', async () => {
      redis.getRaw.mockResolvedValue(null);
      prisma.revokedToken.findUnique.mockResolvedValue({ jti: 'abc' });

      await expect(service.resolve('abc', user.id)).rejects.toMatchObject({
        error: { code: AppErrorCode.SESSION_REVOKED },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rehydrates the cache from the database on a miss', async () => {
      redis.getRaw.mockResolvedValue(null);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.resolve('abc', user.id)).resolves.toEqual(user);
      expect(redis.set).toHaveBeenCalledWith('appk:sess:abc', user, 3600);
    });

    it('rejects a deactivated user on the miss path (AR-5)', async () => {
      redis.getRaw.mockResolvedValue(null);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });

      await expect(service.resolve('abc', user.id)).rejects.toMatchObject({
        error: { code: AppErrorCode.USER_INACTIVE },
      });
    });

    it('rejects an unknown user', async () => {
      redis.getRaw.mockResolvedValue(null);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resolve('abc', user.id)).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe('revoke', () => {
    it('writes a durable record and tombstones the cache entry', async () => {
      redis.getRaw.mockResolvedValue(JSON.stringify(user));

      await expect(service.revoke('abc')).resolves.toEqual({ revoked: true });
      expect(prisma.revokedToken.create).toHaveBeenCalled();
      expect(redis.setRaw).toHaveBeenCalledWith('appk:sess:abc', 'revoked');
    });
  });

  describe('revokeAllForUser', () => {
    it('tombstones every live session for the user', async () => {
      redis.smembers.mockResolvedValue(['jti-1', 'jti-2']);

      await service.revokeAllForUser(user.id);

      expect(redis.setRaw).toHaveBeenCalledWith('appk:sess:jti-1', 'revoked');
      expect(redis.setRaw).toHaveBeenCalledWith('appk:sess:jti-2', 'revoked');
      expect(redis.del).toHaveBeenCalledWith(`appk:usess:${user.id}`);
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/core -- session.service`
Expected: FAIL — `Cannot find module './session.service'`.

- [ ] **Step 5: Write `src/sessions/session.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { RedisService } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import { AppErrorCode, type AuthUser, type JwtPayload } from '@jagoan-pos/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { CoreEnv } from '../config/env.schema';

/** Sentinel written over a session key on logout. */
const REVOKED = 'revoked';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<CoreEnv, true>,
  ) {}

  private get ttlSeconds(): number {
    return this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true });
  }

  async issue(user: AuthUser): Promise<{ accessToken: string; jti: string }> {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      jti,
      role: user.role,
      merchantId: user.merchantId,
    };

    const accessToken = await this.jwt.signAsync(payload);

    await this.redis.set(cacheKeys.session(jti), user, this.ttlSeconds);
    await this.redis.sadd(cacheKeys.userSessions(user.id), jti, this.ttlSeconds);

    return { accessToken, jti };
  }

  /**
   * Fast path: one Redis read. Slow path (eviction only): one revocation
   * lookup plus one user read, then the cache is rehydrated.
   */
  async resolve(jti: string, userId: string): Promise<AuthUser> {
    const cached = await this.redis.getRaw(cacheKeys.session(jti));

    if (cached === REVOKED) {
      throw this.rpc(AppErrorCode.SESSION_REVOKED, 'Session has been revoked');
    }
    if (cached !== null) {
      return JSON.parse(cached) as AuthUser;
    }

    const revoked = await this.prisma.revokedToken.findUnique({ where: { jti } });
    if (revoked) {
      throw this.rpc(AppErrorCode.SESSION_REVOKED, 'Session has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        merchantId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw this.rpc(AppErrorCode.USER_NOT_FOUND, 'User not found');
    }
    if (!user.isActive) {
      throw this.rpc(AppErrorCode.USER_INACTIVE, 'User is inactive');
    }

    await this.redis.set(cacheKeys.session(jti), user, this.ttlSeconds);
    return user;
  }

  async revoke(jti: string): Promise<{ revoked: boolean }> {
    const cached = await this.redis.getRaw(cacheKeys.session(jti));
    if (cached === REVOKED) return { revoked: true };

    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const userId = cached ? (JSON.parse(cached) as AuthUser).id : null;

    if (userId) {
      await this.prisma.revokedToken.create({ data: { jti, userId, expiresAt } });
    }

    // KEEPTTL: the tombstone expires exactly when the token would have,
    // so revocation records never outlive their usefulness.
    await this.redis.setRaw(cacheKeys.session(jti), REVOKED);

    // Opportunistic cleanup — no cron needed at this volume.
    await this.prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    return { revoked: true };
  }

  /** Called when a user is deactivated (FRD AR-5). */
  async revokeAllForUser(userId: string): Promise<void> {
    const jtis = await this.redis.smembers(cacheKeys.userSessions(userId));
    for (const jti of jtis) {
      await this.redis.setRaw(cacheKeys.session(jti), REVOKED);
    }
    await this.redis.del(cacheKeys.userSessions(userId));
    // The database `isActive: false` flag is the durable backstop: any session
    // whose Redis key was evicted fails the miss path in `resolve`.
  }

  private rpc(code: AppErrorCode, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/core -- session.service`
Expected: PASS, 10 tests.

- [ ] **Step 7: Write `src/sessions/sessions.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SessionService } from './session.service';
import type { CoreEnv } from '../config/env.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<CoreEnv, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }) },
      }),
    }),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/core/prisma apps/core/src/sessions
git commit -m "feat(core): add durable session revocation for logout and deactivation"
```

---

## Task 8: `apps/core` — auth hardening

Three defects in the current `AuthService`, all with acceptance criteria in FRD US-1.1:

1. `login` returns before `argon2.verify` when the email is unknown. The message does not leak, but the ~100x response-time difference does.
2. No throttling, despite "5 failed attempts within 15 minutes, then further attempts are throttled."
3. `registerOwner` returns a user but no token, so US-1.3's "and I am logged in" is unmet.

**Files:**
- Modify: `apps/core/src/auth/auth.service.ts`
- Modify: `apps/core/src/auth/auth.controller.ts`
- Modify: `apps/core/src/auth/auth.module.ts`
- Delete: `apps/core/src/auth/dto/auth.dto.ts`
- Modify: `apps/core/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `SessionService` (Task 7), `PrismaService`, `RedisService`, `ConfigService<CoreEnv>`, schemas from `@jagoan-pos/contracts`.
- Produces: `AuthService` with `registerOwner(input): Promise<LoginResult>`, `login(input): Promise<LoginResult>`. `AuthController` answering `core.auth.registerOwner`, `core.auth.login`, `core.auth.resolveSession`, `core.auth.revokeSession`.

- [ ] **Step 1: Write the failing test**

Replace `apps/core/src/auth/auth.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@jagoan-pos/redis';
import { AppErrorCode } from '@jagoan-pos/contracts';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../sessions/session.service';
import { AuthService } from './auth.service';

const prisma = {
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};
const redis = { incrWithTtl: jest.fn(), del: jest.fn() };
const sessions = { issue: jest.fn() };
const config = {
  get: (key: string) =>
    ({ LOGIN_MAX_ATTEMPTS: 5, LOGIN_ATTEMPT_WINDOW_SECONDS: 900 })[key],
};

describe('AuthService.login', () => {
  let service: AuthService;
  let realHash: string;

  beforeAll(async () => {
    realHash = await argon2.hash('correct-horse');
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    redis.incrWithTtl.mockResolvedValue(1);
    sessions.issue.mockResolvedValue({ accessToken: 'token', jti: 'jti' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: SessionService, useValue: sessions },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    await service.onModuleInit();
  });

  it('returns a token for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      merchantId: 'm1',
      fullName: 'Bu Tini',
      email: 'butini@example.com',
      passwordHash: realHash,
      role: 'OWNER',
      isActive: true,
    });

    const result = await service.login({ email: 'butini@example.com', password: 'correct-horse' });
    expect(result.accessToken).toBe('token');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('gives the same error code for an unknown email and a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const unknown = await service.login({ email: 'nobody@x.com', password: 'p' }).catch((e) => e);

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: realHash,
      isActive: true,
      role: 'CASHIER',
      merchantId: 'm1',
      fullName: 'X',
      email: 'a@b.com',
    });
    const wrong = await service.login({ email: 'a@b.com', password: 'wrong' }).catch((e) => e);

    expect(unknown.error.code).toBe(AppErrorCode.INVALID_CREDENTIALS);
    expect(wrong.error.code).toBe(AppErrorCode.INVALID_CREDENTIALS);
  });

  // FRD US-1.1: the error must not reveal whether the email exists. A cheap
  // early return leaks that through response time even when the text matches.
  it('verifies against a dummy hash so an unknown email costs the same as a known one', async () => {
    const verifySpy = jest.spyOn(argon2, 'verify');
    prisma.user.findUnique.mockResolvedValue(null);

    await service.login({ email: 'nobody@x.com', password: 'p' }).catch(() => undefined);

    expect(verifySpy).toHaveBeenCalledTimes(1);
    verifySpy.mockRestore();
  });

  it('throttles after the configured number of failures', async () => {
    redis.incrWithTtl.mockResolvedValue(6);

    const error = await service.login({ email: 'a@b.com', password: 'p' }).catch((e) => e);

    expect(error.error.code).toBe(AppErrorCode.TOO_MANY_ATTEMPTS);
    // Rejected before any database work.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('clears the attempt counter after a successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      merchantId: 'm1',
      fullName: 'Bu Tini',
      email: 'butini@example.com',
      passwordHash: realHash,
      role: 'OWNER',
      isActive: true,
    });

    await service.login({ email: 'butini@example.com', password: 'correct-horse' });
    expect(redis.del).toHaveBeenCalledWith('appk:login-attempts:butini@example.com');
  });

  it('rejects a deactivated user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      merchantId: 'm1',
      fullName: 'X',
      email: 'a@b.com',
      passwordHash: realHash,
      role: 'CASHIER',
      isActive: false,
    });

    const error = await service.login({ email: 'a@b.com', password: 'correct-horse' }).catch((e) => e);
    expect(error.error.code).toBe(AppErrorCode.USER_INACTIVE);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/core -- auth.service`
Expected: FAIL — `service.onModuleInit is not a function`, and the throttle/timing tests fail.

- [ ] **Step 3: Rewrite `src/auth/auth.service.ts`**

```ts
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { RedisService } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import {
  AppErrorCode,
  type AuthUser,
  type LoginInput,
  type LoginResult,
  type RegisterOwnerInput,
} from '@jagoan-pos/contracts';
import { Prisma } from '../../generated/prisma/client';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../sessions/session.service';
import type { CoreEnv } from '../config/env.schema';

const AUTH_USER_SELECT = {
  id: true,
  merchantId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
} as const;

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Verified against when no user matches, so an unknown email costs the same
   * ~100ms as a known one. Generated at boot rather than hard-coded so there
   * is no constant to leak or go stale (FRD US-1.1).
   */
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService<CoreEnv, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'));
  }

  async registerOwner(input: RegisterOwnerInput): Promise<LoginResult> {
    const passwordHash = await argon2.hash(input.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({ data: { name: input.merchantName } });
        return tx.user.create({
          data: {
            fullName: input.fullName,
            email: input.email,
            passwordHash,
            role: Role.OWNER,
            merchantId: merchant.id,
          },
          select: AUTH_USER_SELECT,
        });
      });

      // US-1.3: "a Merchant and an Owner account are created together and I am
      // logged in" — registration must return a usable session.
      const { accessToken } = await this.sessions.issue(user);
      return { accessToken, user };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new RpcException({
          code: AppErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const { email, password } = input;
    await this.assertNotThrottled(email);

    const record = await this.prisma.user.findUnique({
      where: { email },
      select: { ...AUTH_USER_SELECT, passwordHash: true },
    });

    // Always run one verification, whether or not the user exists.
    const passwordMatches = await argon2
      .verify(record?.passwordHash ?? this.dummyHash, password)
      .catch(() => false);

    if (!record || !passwordMatches) {
      throw new RpcException({
        code: AppErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    if (!record.isActive) {
      throw new RpcException({
        code: AppErrorCode.USER_INACTIVE,
        message: 'User is inactive',
      });
    }

    await this.redis.del(cacheKeys.loginAttempts(email));

    const { passwordHash: _passwordHash, ...user } = record;
    const { accessToken } = await this.sessions.issue(user satisfies AuthUser);
    return { accessToken, user };
  }

  /**
   * Counts every attempt, not just failures — a successful login clears the
   * counter, so an honest user is never affected while a guesser is.
   */
  private async assertNotThrottled(email: string): Promise<void> {
    const max = this.config.get('LOGIN_MAX_ATTEMPTS', { infer: true });
    const window = this.config.get('LOGIN_ATTEMPT_WINDOW_SECONDS', { infer: true });

    const attempts = await this.redis.incrWithTtl(cacheKeys.loginAttempts(email), window);
    if (attempts > max) {
      throw new RpcException({
        code: AppErrorCode.TOO_MANY_ATTEMPTS,
        message: 'Too many login attempts. Try again later.',
      });
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/core -- auth.service`
Expected: PASS, 6 tests.

- [ ] **Step 5: Rewrite `src/auth/auth.controller.ts`**

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  type AuthUser,
  type LoginInput,
  type LoginResult,
  type RegisterOwnerInput,
  type ResolveSessionInput,
  type RevokeSessionInput,
  loginSchema,
  registerOwnerSchema,
  resolveSessionSchema,
  revokeSessionSchema,
  type RpcEnvelope,
} from '@jagoan-pos/contracts';
import { AuthService } from './auth.service';
import { SessionService } from '../sessions/session.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @MessagePattern('core.auth.registerOwner')
  register(
    @Payload('data', new ZodValidationPipe(registerOwnerSchema)) data: RegisterOwnerInput,
  ): Promise<LoginResult> {
    return this.auth.registerOwner(data);
  }

  @MessagePattern('core.auth.login')
  login(
    @Payload('data', new ZodValidationPipe(loginSchema)) data: LoginInput,
  ): Promise<LoginResult> {
    return this.auth.login(data);
  }

  @MessagePattern('core.auth.resolveSession')
  resolveSession(
    @Payload('data', new ZodValidationPipe(resolveSessionSchema)) data: ResolveSessionInput,
  ): Promise<AuthUser> {
    return this.sessions.resolve(data.jti, data.userId);
  }

  @MessagePattern('core.auth.revokeSession')
  revokeSession(
    @Payload('data', new ZodValidationPipe(revokeSessionSchema)) data: RevokeSessionInput,
  ): Promise<{ revoked: boolean }> {
    return this.sessions.revoke(data.jti);
  }
}
```

`@Payload('data', ...)` unwraps the `RpcEnvelope` and validates only the body. `RpcEnvelope` is imported for the type-level guarantee that these patterns receive envelopes — see Task 9 for handlers that also read `meta`.

- [ ] **Step 6: Rewrite `src/auth/auth.module.ts` and delete the DTO file**

```ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

```bash
rm -rf apps/core/src/auth/dto
```

The `JwtModule` registration moved to `SessionsModule` — signing is a session concern, and having one module own it means the TTL cannot drift between the token and its Redis entry.

- [ ] **Step 7: Verify the whole core suite and typecheck**

```bash
npm test --workspace=@jagoan-pos/core && npm run typecheck --workspace=@jagoan-pos/core
```
Expected: all suites pass; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add apps/core/src/auth
git commit -m "fix(core): close login timing leak, add attempt throttling, issue session on register"
```

---

## Task 9: `apps/core` — staff module on a tenant-scoped repository

FRD AR-2: "Tenant scoping is enforced at the data-access layer, not in controllers. A query for merchant data without a `merchant_id` filter must be impossible to express."

This is the reason `staff.repository.ts` exists — not layering for its own sake. Every method takes `merchantId` first and injects it into every `where`. `AuthService` has no repository because it queries globally by email; adding one there would be ceremony.

The current controller also takes `merchantId` from the payload, which means a caller could assert any merchant. It now comes from `meta.actor`.

**Files:**
- Create: `apps/core/src/staff/staff.repository.ts`
- Modify: `apps/core/src/staff/staff.service.ts`
- Modify: `apps/core/src/staff/staff.controller.ts`
- Modify: `apps/core/src/staff/staff.module.ts`
- Delete: `apps/core/src/staff/dto/staff.dto.ts`
- Modify: `apps/core/src/staff/staff.service.spec.ts`
- Test: `apps/core/src/staff/staff.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `RedisService`, `SessionService`, `cacheKeys`, staff schemas from `@jagoan-pos/contracts`.
- Produces: `StaffRepository` with `listCashiers(merchantId)`, `createCashier(merchantId, input, passwordHash)`, `setCashierActive(merchantId, cashierId, isActive)`. `StaffService` with `list(merchantId): Promise<CashierListResult>`, `create(merchantId, input): Promise<CashierSummary>`, `setActive(merchantId, input): Promise<CashierSummary>`.

- [ ] **Step 1: Write the failing repository test**

Create `apps/core/src/staff/staff.repository.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StaffRepository } from './staff.repository';

const prisma = {
  user: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
};

const MERCHANT = '22222222-2222-4222-8222-222222222222';
const CASHIER = '33333333-3333-4333-8333-333333333333';

describe('StaffRepository', () => {
  let repo: StaffRepository;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [StaffRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    repo = moduleRef.get(StaffRepository);
  });

  // FRD AR-2: no query may escape its tenant.
  it('scopes the cashier list to the merchant and the CASHIER role', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await repo.listCashiers(MERCHANT);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { merchantId: MERCHANT, role: 'CASHIER' } }),
    );
  });

  it('binds a created cashier to the merchant', async () => {
    prisma.user.create.mockResolvedValue({ id: CASHIER });
    await repo.createCashier(MERCHANT, { fullName: 'Ani', email: 'ani@x.com' }, 'hash');

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ merchantId: MERCHANT, role: 'CASHIER' }),
      }),
    );
  });

  // FRD AR-3: another merchant's cashier must be indistinguishable from a
  // nonexistent one, so this returns null rather than throwing a 403.
  it('returns null when the cashier belongs to another merchant', async () => {
    prisma.user.update.mockRejectedValue(
      Object.assign(new Error('not found'), { code: 'P2025' }),
    );

    await expect(repo.setCashierActive(MERCHANT, CASHIER, false)).resolves.toBeNull();
  });

  it('updates in a single round trip scoped by merchant and role', async () => {
    prisma.user.update.mockResolvedValue({ id: CASHIER, isActive: false });

    const result = await repo.setCashierActive(MERCHANT, CASHIER, false);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CASHIER, merchantId: MERCHANT, role: 'CASHIER' },
        data: { isActive: false },
      }),
    );
    expect(result).toEqual({ id: CASHIER, isActive: false });
  });
});
```

The last test pins a fix: the current `setCashierActive` does `updateMany` then a separate `findUnique` — two round trips, and the second is unscoped.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/core -- staff.repository`
Expected: FAIL — `Cannot find module './staff.repository'`.

- [ ] **Step 3: Write `src/staff/staff.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const CASHIER_SELECT = {
  id: true,
  merchantId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type CashierRow = Prisma.UserGetPayload<{ select: typeof CASHIER_SELECT }>;

/**
 * The tenant-scoping boundary (FRD AR-2). Every method takes `merchantId`
 * first and injects it into the `where`, so an unscoped query over
 * merchant-owned rows cannot be written through this class.
 */
@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCashiers(merchantId: string): Promise<CashierRow[]> {
    return this.prisma.user.findMany({
      where: { merchantId, role: Role.CASHIER },
      select: CASHIER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  createCashier(
    merchantId: string,
    input: { fullName: string; email: string },
    passwordHash: string,
  ): Promise<CashierRow> {
    return this.prisma.user.create({
      data: {
        merchantId,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        role: Role.CASHIER,
        isActive: true,
      },
      select: CASHIER_SELECT,
    });
  }

  /**
   * Returns null when no row matches — including when the cashier exists but
   * belongs to another merchant. The caller maps that to NOT_FOUND so
   * existence never leaks across tenants (FRD AR-3).
   */
  async setCashierActive(
    merchantId: string,
    cashierId: string,
    isActive: boolean,
  ): Promise<CashierRow | null> {
    try {
      return await this.prisma.user.update({
        where: { id: cashierId, merchantId, role: Role.CASHIER },
        data: { isActive },
        select: CASHIER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      // The spec mocks a plain object with `code`, so match structurally too.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }
}
```

`where: { id, merchantId, role }` on `update` requires Prisma's extended `where` on unique operations, available since Prisma 5.

- [ ] **Step 4: Run the repository test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/core -- staff.repository`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing service test**

Replace `apps/core/src/staff/staff.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { RedisService } from '@jagoan-pos/redis';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../sessions/session.service';
import { StaffRepository } from './staff.repository';
import { StaffService } from './staff.service';

const repo = { listCashiers: jest.fn(), createCashier: jest.fn(), setCashierActive: jest.fn() };
const redis = { del: jest.fn() };
const sessions = { revokeAllForUser: jest.fn() };

const MERCHANT = '22222222-2222-4222-8222-222222222222';
const CASHIER = '33333333-3333-4333-8333-333333333333';
const row = {
  id: CASHIER,
  merchantId: MERCHANT,
  fullName: 'Ani',
  email: 'ani@x.com',
  role: 'CASHIER' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: StaffRepository, useValue: repo },
        { provide: RedisService, useValue: redis },
        { provide: SessionService, useValue: sessions },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(StaffService);
  });

  it('summarizes active and inactive cashiers', async () => {
    repo.listCashiers.mockResolvedValue([row, { ...row, id: 'x', isActive: false }]);

    const result = await service.list(MERCHANT);

    expect(result.summary).toEqual({ total: 2, active: 1, inactive: 1 });
  });

  it('invalidates the cashier cache after creating one', async () => {
    repo.createCashier.mockResolvedValue(row);

    await service.create(MERCHANT, { fullName: 'Ani', email: 'ani@x.com', password: 'password1' });

    expect(redis.del).toHaveBeenCalledWith(`appk:core:cashiers:${MERCHANT}`);
  });

  it('reports NOT_FOUND when the cashier is not in this merchant', async () => {
    repo.setCashierActive.mockResolvedValue(null);

    const error = await service
      .setActive(MERCHANT, { cashierId: CASHIER, isActive: false })
      .catch((e) => e);

    expect(error.error.code).toBe(AppErrorCode.CASHIER_NOT_FOUND);
  });

  // FRD US-1.5 / AR-5: "a departing employee loses access immediately".
  it('revokes live sessions when a cashier is deactivated', async () => {
    repo.setCashierActive.mockResolvedValue({ ...row, isActive: false });

    await service.setActive(MERCHANT, { cashierId: CASHIER, isActive: false });

    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(CASHIER);
  });

  it('does not revoke sessions when a cashier is reactivated', async () => {
    repo.setCashierActive.mockResolvedValue(row);

    await service.setActive(MERCHANT, { cashierId: CASHIER, isActive: true });

    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run the service test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/core -- staff.service`
Expected: FAIL — `service.list is not a function`.

- [ ] **Step 7: Rewrite `src/staff/staff.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as argon2 from 'argon2';
import { RedisService } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import {
  AppErrorCode,
  type CashierListResult,
  type CashierSummary,
  type CreateCashierInput,
  type SetCashierActiveInput,
} from '@jagoan-pos/contracts';
import { Prisma } from '../../generated/prisma/client';
import { SessionService } from '../sessions/session.service';
import { type CashierRow, StaffRepository } from './staff.repository';

@Injectable()
export class StaffService {
  constructor(
    private readonly repo: StaffRepository,
    private readonly redis: RedisService,
    private readonly sessions: SessionService,
  ) {}

  async list(merchantId: string): Promise<CashierListResult> {
    const rows = await this.repo.listCashiers(merchantId);
    const active = rows.reduce((count, row) => count + (row.isActive ? 1 : 0), 0);

    return {
      data: rows.map(toSummary),
      summary: { total: rows.length, active, inactive: rows.length - active },
    };
  }

  async create(merchantId: string, input: CreateCashierInput): Promise<CashierSummary> {
    const passwordHash = await argon2.hash(input.password);

    try {
      const row = await this.repo.createCashier(merchantId, input, passwordHash);
      await this.redis.del(cacheKeys.cashiers(merchantId));
      return toSummary(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new RpcException({
          code: AppErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
      throw error;
    }
  }

  async setActive(merchantId: string, input: SetCashierActiveInput): Promise<CashierSummary> {
    const row = await this.repo.setCashierActive(merchantId, input.cashierId, input.isActive);

    if (!row) {
      // Also the answer when the cashier belongs to another merchant — no
      // existence leakage across tenants (FRD AR-3).
      throw new RpcException({
        code: AppErrorCode.CASHIER_NOT_FOUND,
        message: 'Cashier not found',
      });
    }

    await this.redis.del(cacheKeys.cashiers(merchantId));

    if (!input.isActive) {
      await this.sessions.revokeAllForUser(input.cashierId);
    }

    return toSummary(row);
  }
}

/** Dates cross the wire as ISO strings; the contract type says so. */
function toSummary(row: CashierRow): CashierSummary {
  return {
    id: row.id,
    merchantId: row.merchantId,
    fullName: row.fullName,
    email: row.email,
    role: 'CASHIER',
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 8: Run the service test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/core -- staff.service`
Expected: PASS, 5 tests.

- [ ] **Step 9: Rewrite `src/staff/staff.controller.ts`**

```ts
import { Controller, ForbiddenException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ZodValidationPipe } from 'nestjs-zod';
import { RedisCacheInterceptor, Cacheable } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import { UseInterceptors } from '@nestjs/common';
import {
  AppErrorCode,
  type CashierListResult,
  type CashierSummary,
  type CreateCashierInput,
  type RpcEnvelope,
  type SetCashierActiveInput,
  createCashierSchema,
  setCashierActiveSchema,
} from '@jagoan-pos/contracts';
import { StaffService } from './staff.service';

@Controller()
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @MessagePattern('core.staff.listCashiers')
  @UseInterceptors(RedisCacheInterceptor)
  @Cacheable({
    key: (ctx) => {
      const envelope = ctx.switchToRpc().getData<RpcEnvelope<unknown>>();
      const merchantId = envelope?.meta?.actor?.merchantId;
      return merchantId ? cacheKeys.cashiers(merchantId) : null;
    },
    ttlSeconds: 300,
  })
  listCashiers(@Payload() envelope: RpcEnvelope<unknown>): Promise<CashierListResult> {
    return this.staff.list(requireMerchant(envelope));
  }

  @MessagePattern('core.staff.createCashier')
  createCashier(
    @Payload() envelope: RpcEnvelope<unknown>,
    @Payload('data', new ZodValidationPipe(createCashierSchema)) data: CreateCashierInput,
  ): Promise<CashierSummary> {
    return this.staff.create(requireMerchant(envelope), data);
  }

  @MessagePattern('core.staff.setCashierActive')
  setCashierActive(
    @Payload() envelope: RpcEnvelope<unknown>,
    @Payload('data', new ZodValidationPipe(setCashierActiveSchema)) data: SetCashierActiveInput,
  ): Promise<CashierSummary> {
    return this.staff.setActive(requireMerchant(envelope), data);
  }
}

/**
 * The tenant comes from the JWT-derived actor, never from the request body,
 * so a caller cannot name a merchant it does not belong to (FRD AR-1, AR-3).
 */
function requireMerchant(envelope: RpcEnvelope<unknown>): string {
  const merchantId = envelope.meta.actor?.merchantId;
  if (!merchantId) {
    throw new RpcException({
      code: AppErrorCode.FORBIDDEN,
      message: 'Caller is not scoped to a merchant',
    });
  }
  return merchantId;
}
```

Note the cache key now reads `meta.actor.merchantId`. The old version had a `typeof data === 'string' ? data : data?.merchantId` fallback — defensive code for a payload shape that the envelope now makes impossible.

Remove the unused `ForbiddenException` import if lint flags it.

- [ ] **Step 10: Rewrite `src/staff/staff.module.ts` and delete the DTO file**

```ts
import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
})
export class StaffModule {}
```

```bash
rm -rf apps/core/src/staff/dto
```

- [ ] **Step 11: Verify the full core suite, typecheck, and boot**

```bash
npm test --workspace=@jagoan-pos/core
npm run typecheck --workspace=@jagoan-pos/core
npm run build --workspace=@jagoan-pos/core && node apps/core/dist/main.js &
sleep 3 && nc -z localhost 4001 && echo "core listening" && kill %1
```
Expected: all tests pass; typecheck clean; `core listening`.

- [ ] **Step 12: Commit**

```bash
git add apps/core/src/staff
git commit -m "refactor(core): scope staff queries in a repository, derive tenant from rpc actor"
```

---

## Task 10: `apps/api-gateway` — skeleton, correlation IDs, and the exception filter

**Files:**
- Create: `apps/api-gateway/src/config/env.schema.ts`
- Create: `apps/api-gateway/.env.example`
- Create: `apps/api-gateway/src/common/middleware/correlation-id.middleware.ts`
- Create: `apps/api-gateway/src/common/filters/rpc-exception.filter.ts`
- Create: `apps/api-gateway/src/common/interceptors/logging.interceptor.ts`
- Modify: `apps/api-gateway/src/main.ts`
- Modify: `apps/api-gateway/src/app.module.ts`
- Modify: `apps/api-gateway/package.json`, `tsconfig.json`
- Delete: `apps/api-gateway/src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`, `test/`, `src/common/filters/rpc-error.filter.ts`
- Test: `apps/api-gateway/src/common/filters/rpc-exception.filter.spec.ts`

**Interfaces:**
- Consumes: `AppErrorCode`, `RpcErrorShape` from `@jagoan-pos/contracts`; `validateEnv`, `buildLoggerOptions` from `@jagoan-pos/shared`.
- Produces: `gatewayEnvSchema`, `type GatewayEnv`; `CorrelationIdMiddleware` setting `req.correlationId` and the `x-correlation-id` response header; `RpcExceptionFilter` mapping `AppErrorCode` → HTTP status.

- [ ] **Step 1: Write the failing test**

Create `apps/api-gateway/src/common/filters/rpc-exception.filter.spec.ts`:

```ts
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { RpcExceptionFilter } from './rpc-exception.filter';

function makeHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ correlationId: 'cid-1' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('RpcExceptionFilter', () => {
  const filter = new RpcExceptionFilter();

  it.each([
    [AppErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT],
    [AppErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED],
    [AppErrorCode.SESSION_REVOKED, HttpStatus.UNAUTHORIZED],
    [AppErrorCode.USER_INACTIVE, HttpStatus.FORBIDDEN],
    [AppErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN],
    [AppErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND],
    [AppErrorCode.CASHIER_NOT_FOUND, HttpStatus.NOT_FOUND],
    [AppErrorCode.TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS],
  ])('maps %s to %i', (code, expected) => {
    const { host, status } = makeHost();
    filter.catch({ code, message: 'x' }, host);
    expect(status).toHaveBeenCalledWith(expected);
  });

  it('passes an HttpException through with its own status', () => {
    const { host, status } = makeHost();
    filter.catch(new HttpException('nope', HttpStatus.BAD_REQUEST), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  // An unmapped or absent code must never surface internals to the client.
  it('falls back to 500 with a generic message for an unknown shape', () => {
    const { host, status, json } = makeHost();
    filter.catch(new Error('connect ECONNREFUSED 10.0.0.4:4001'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: AppErrorCode.INTERNAL_ERROR, message: 'Internal server error' }),
    );
  });

  it('echoes the correlation id so a client error can be traced to a log line', () => {
    const { host, json } = makeHost();
    filter.catch({ code: AppErrorCode.USER_NOT_FOUND, message: 'nope' }, host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'cid-1' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- rpc-exception`
Expected: FAIL — module not found, and the workspace is still `api-gateway`.

- [ ] **Step 3: Write `src/common/filters/rpc-exception.filter.ts`**

```ts
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppErrorCode, type RpcErrorShape } from '@jagoan-pos/contracts';

const STATUS_BY_CODE: Record<AppErrorCode, HttpStatus> = {
  [AppErrorCode.EMAIL_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [AppErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [AppErrorCode.SESSION_REVOKED]: HttpStatus.UNAUTHORIZED,
  [AppErrorCode.USER_INACTIVE]: HttpStatus.FORBIDDEN,
  [AppErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [AppErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.CASHIER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.TOO_MANY_ATTEMPTS]: HttpStatus.TOO_MANY_REQUESTS,
  [AppErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

// `@Catch()` with no arguments is required for a catch-all filter. Without the
// decorator, Nest has no catch metadata to bind against.
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const correlationId = (http.getRequest<Request & { correlationId?: string }>() ?? {})
      .correlationId;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body, correlationId }
          : { ...(body as object), correlationId },
      );
      return;
    }

    const shape = this.toErrorShape(exception);

    if (shape.code === AppErrorCode.INTERNAL_ERROR) {
      // Log the real cause; return nothing that describes internal topology.
      this.logger.error({ err: exception, correlationId }, 'unhandled gateway exception');
    }

    const status = STATUS_BY_CODE[shape.code];
    response.status(status).json({
      statusCode: status,
      code: shape.code,
      message: shape.message,
      correlationId,
    });
  }

  /**
   * An RpcException crossing the TCP boundary arrives as a plain object,
   * sometimes wrapped in `{ error: ... }` depending on transport internals.
   */
  private toErrorShape(exception: unknown): RpcErrorShape {
    const generic: RpcErrorShape = {
      code: AppErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };

    if (typeof exception !== 'object' || exception === null) return generic;

    const record = exception as Record<string, unknown>;
    const candidate =
      typeof record.error === 'object' && record.error !== null
        ? (record.error as Record<string, unknown>)
        : record;

    const code = candidate.code;
    if (typeof code !== 'string' || !(code in STATUS_BY_CODE)) return generic;

    return {
      code: code as AppErrorCode,
      message: typeof candidate.message === 'string' ? candidate.message : 'Request failed',
    };
  }
}
```

Two fixes over the current `RpcErrorFilter`: it now has `@Catch()`, and an unrecognized code returns a generic message instead of echoing `connect ECONNREFUSED 10.0.0.4:4001` to the client.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- rpc-exception`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write `src/config/env.schema.ts` and `.env.example`**

```ts
import { z } from 'zod';

export const gatewayEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GATEWAY_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:3001'),

  CORE_HOST: z.string().min(1).default('127.0.0.1'),
  CORE_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),

  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
```

`apps/api-gateway/.env.example`:

```dotenv
NODE_ENV=development
GATEWAY_PORT=3000
CORS_ORIGINS=http://localhost:3001

CORE_HOST=127.0.0.1
CORE_TCP_PORT=4001

REDIS_URL=redis://:redis_dev_password@localhost:6379
JWT_SECRET=replace-me-with-at-least-32-characters-of-entropy
```

`JWT_SECRET` is shared with `core` because core signs and the gateway verifies. Same value, two `.env` files — the cost of per-service env config, and worth stating in the README rather than discovering at 401 time.

- [ ] **Step 6: Write `src/common/middleware/correlation-id.middleware.ts`**

```ts
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const HEADER = 'x-correlation-id';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId: string;
  }
}

/** Accepts an inbound id so a trace survives across the whole call chain. */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.header(HEADER);
    req.correlationId = inbound && inbound.length <= 64 ? inbound : randomUUID();
    res.setHeader(HEADER, req.correlationId);
    next();
  }
}
```

- [ ] **Step 7: Write `src/common/interceptors/logging.interceptor.ts`**

```ts
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `${req.method} ${req.originalUrl} ${Date.now() - startedAt}ms cid=${req.correlationId}`,
          ),
        error: (error: unknown) =>
          this.logger.warn(
            `${req.method} ${req.originalUrl} failed in ${Date.now() - startedAt}ms cid=${req.correlationId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
      }),
    );
  }
}
```

- [ ] **Step 8: Rewrite `src/main.ts`**

```ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { GatewayEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<GatewayEnv, true>);

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }).split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalFilters(new RpcExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Jagoan POS API')
      .setDescription('The only public HTTP surface. All services sit behind it over TCP.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  const port = config.get('GATEWAY_PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`gateway listening on http://localhost:${port}/api`);
}

void bootstrap();
```

The global `ZodValidationPipe` is dropped here too — route DTOs built with `createZodDto` validate through Nest's per-route pipe in Task 12.

- [ ] **Step 9: Rewrite `src/app.module.ts`**

```ts
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { resolve } from 'node:path';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { RedisModule } from '@jagoan-pos/redis';
import { gatewayEnvSchema } from './config/env.schema';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ClientsModule } from './clients/clients.module';
import { AuthRoutesModule } from './routes/auth/auth.module';
import { StaffRoutesModule } from './routes/staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '..', '.env')],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(gatewayEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('api-gateway')),
    RedisModule,
    ClientsModule,
    AuthRoutesModule,
    StaffRoutesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

This will not compile until Tasks 11 and 12 create `ClientsModule`, `AuthRoutesModule`, and `StaffRoutesModule`. That is expected; the typecheck gate for this task is Step 11 below, scoped to the files this task creates.

- [ ] **Step 10: Update the manifest, tsconfig, and delete boilerplate**

`apps/api-gateway/package.json` — rename to `@jagoan-pos/api-gateway`, mirroring core's script block, with these dependencies:

```json
{
  "dependencies": {
    "@jagoan-pos/contracts": "^0.0.1",
    "@jagoan-pos/redis": "^0.0.1",
    "@jagoan-pos/shared": "^0.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/microservices": "^11.1.28",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.0.3",
    "nestjs-pino": "^4.4.0",
    "nestjs-zod": "^5.5.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.4.3"
  }
}
```

```bash
rm -f apps/api-gateway/src/app.controller.ts apps/api-gateway/src/app.service.ts \
      apps/api-gateway/src/app.controller.spec.ts \
      apps/api-gateway/src/common/filters/rpc-error.filter.ts
rm -rf apps/api-gateway/test apps/api-gateway/tsconfig.build.json
cp apps/api-gateway/.env.example apps/api-gateway/.env
```

`apps/api-gateway/tsconfig.json` mirrors core's, extending `../../tsconfig.base.json` with `outDir: "./dist"` and `types: ["jest", "node"]`.

- [ ] **Step 11: Verify the filter typechecks in isolation**

```bash
npm install
npx tsc --noEmit --strict --esModuleInterop --experimentalDecorators --emitDecoratorMetadata \
  --skipLibCheck apps/api-gateway/src/common/filters/rpc-exception.filter.ts
npm test --workspace=@jagoan-pos/api-gateway
```
Expected: no type errors from the filter; 11 tests pass.

- [ ] **Step 12: Commit**

```bash
git add apps/api-gateway package.json package-lock.json
git commit -m "refactor(api-gateway): add zod env, correlation ids, and a safe catch-all filter"
```

---

## Task 11: `apps/api-gateway` — typed outbound clients

The current gateway injects a raw `ClientProxy` into controllers and returns `Observable<unknown>`, so a typo in a pattern name or payload shape is a runtime 500. A thin typed wrapper turns both into compile errors, and is the place the `RpcEnvelope` gets built exactly once.

`AuthModule` currently exports `ClientsModule` so `StaffModule` can reach `CORE_SERVICE` — staff depends on auth for a transport token it has nothing to do with. A dedicated `ClientsModule` removes that.

**Files:**
- Create: `apps/api-gateway/src/clients/clients.module.ts`
- Create: `apps/api-gateway/src/clients/typed.client.ts`
- Create: `apps/api-gateway/src/clients/core.client.ts`
- Test: `apps/api-gateway/src/clients/core.client.spec.ts`

Only the core client is built here. `products.client.ts`, `transactions.client.ts`, and `reports.client.ts` land with the feature plans that give them a caller — a wrapper with no consumer is dead code, and `TypedClient` makes each one about fifteen lines.

**Interfaces:**
- Consumes: `CoreContract`, `CorePattern`, `CoreRequest`, `CoreResponse`, `RpcEnvelope`, `Actor` from `@jagoan-pos/contracts`.
- Produces:
  - `CORE_SERVICE` injection token
  - `abstract class TypedClient<TContract>` with `protected dispatch<P>(pattern, data, meta)`
  - `CoreClient` with `login`, `registerOwner`, `resolveSession`, `revokeSession`, `listCashiers`, `createCashier`, `setCashierActive` — each returning a `Promise` of its contract response type
  - `ClientsModule` exports `CoreClient`

- [ ] **Step 1: Write the failing test**

Create `apps/api-gateway/src/clients/core.client.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CORE_SERVICE, CoreClient } from './core.client';

const proxy = { send: jest.fn() };

const actor = {
  userId: '11111111-1111-4111-8111-111111111111',
  role: 'OWNER' as const,
  merchantId: '22222222-2222-4222-8222-222222222222',
};
const meta = { correlationId: 'cid-1', actor };

describe('CoreClient', () => {
  let client: CoreClient;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [CoreClient, { provide: CORE_SERVICE, useValue: proxy as unknown as ClientProxy }],
    }).compile();
    client = moduleRef.get(CoreClient);
  });

  it('wraps the payload in an envelope and resolves a promise', async () => {
    proxy.send.mockReturnValue(of({ accessToken: 't', user: { id: 'u1' } }));

    const result = await client.login({ email: 'a@b.com', password: 'p' }, meta);

    expect(proxy.send).toHaveBeenCalledWith('core.auth.login', {
      meta,
      data: { email: 'a@b.com', password: 'p' },
    });
    expect(result.accessToken).toBe('t');
  });

  // Every merchant-scoped call must carry the actor, or core cannot scope it.
  it('forwards the actor on merchant-scoped calls', async () => {
    proxy.send.mockReturnValue(of({ data: [], summary: { total: 0, active: 0, inactive: 0 } }));

    await client.listCashiers(meta);

    expect(proxy.send).toHaveBeenCalledWith('core.staff.listCashiers', { meta, data: {} });
  });

  it('rejects with the underlying error so the filter can map it', async () => {
    proxy.send.mockReturnValue(throwError(() => ({ code: 'CASHIER_NOT_FOUND', message: 'nope' })));

    await expect(
      client.setCashierActive({ cashierId: 'c1', isActive: false }, meta),
    ).rejects.toMatchObject({ code: 'CASHIER_NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- core.client`
Expected: FAIL — `Cannot find module './core.client'`.

- [ ] **Step 3: Write `src/clients/typed.client.ts`**

```ts
import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { RpcEnvelope, RpcMeta } from '@jagoan-pos/contracts';

/**
 * A contract map: pattern string -> { request, response }.
 */
export type ContractMap = Record<string, { request: unknown; response: unknown }>;

/**
 * Builds the RpcEnvelope in exactly one place and converts the transport's
 * Observable into a Promise, so controllers never handle either concern.
 */
export abstract class TypedClient<TContract extends ContractMap> {
  protected constructor(protected readonly proxy: ClientProxy) {}

  protected dispatch<P extends keyof TContract & string>(
    pattern: P,
    data: TContract[P]['request'],
    meta: RpcMeta,
  ): Promise<TContract[P]['response']> {
    const envelope: RpcEnvelope<TContract[P]['request']> = { meta, data };
    return firstValueFrom(this.proxy.send<TContract[P]['response']>(pattern, envelope));
  }
}
```

- [ ] **Step 4: Write `src/clients/core.client.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import type {
  AuthUser,
  CashierListResult,
  CashierSummary,
  CoreContract,
  CreateCashierInput,
  LoginInput,
  LoginResult,
  RegisterOwnerInput,
  RpcMeta,
  SetCashierActiveInput,
} from '@jagoan-pos/contracts';
import { TypedClient } from './typed.client';

export const CORE_SERVICE = Symbol('CORE_SERVICE');

@Injectable()
export class CoreClient extends TypedClient<CoreContract> {
  constructor(@Inject(CORE_SERVICE) proxy: ClientProxy) {
    super(proxy);
  }

  registerOwner(data: RegisterOwnerInput, meta: RpcMeta): Promise<LoginResult> {
    return this.dispatch('core.auth.registerOwner', data, meta);
  }

  login(data: LoginInput, meta: RpcMeta): Promise<LoginResult> {
    return this.dispatch('core.auth.login', data, meta);
  }

  resolveSession(jti: string, userId: string, meta: RpcMeta): Promise<AuthUser> {
    return this.dispatch('core.auth.resolveSession', { jti, userId }, meta);
  }

  revokeSession(jti: string, meta: RpcMeta): Promise<{ revoked: boolean }> {
    return this.dispatch('core.auth.revokeSession', { jti }, meta);
  }

  // Merchant scope travels in meta.actor, so there is no body.
  listCashiers(meta: RpcMeta): Promise<CashierListResult> {
    return this.dispatch('core.staff.listCashiers', {}, meta);
  }

  createCashier(data: CreateCashierInput, meta: RpcMeta): Promise<CashierSummary> {
    return this.dispatch('core.staff.createCashier', data, meta);
  }

  setCashierActive(data: SetCashierActiveInput, meta: RpcMeta): Promise<CashierSummary> {
    return this.dispatch('core.staff.setCashierActive', data, meta);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- core.client`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write `src/clients/clients.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CORE_SERVICE, CoreClient } from './core.client';
import type { GatewayEnv } from '../config/env.schema';

@Global()
@Module({
  providers: [
    {
      provide: CORE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<GatewayEnv, true>) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.get('CORE_HOST', { infer: true }),
            port: config.get('CORE_TCP_PORT', { infer: true }),
          },
        }),
    },
    CoreClient,
  ],
  exports: [CoreClient],
})
export class ClientsModule {}
```

- [ ] **Step 7: Verify a wrong pattern is a compile error, not a runtime one**

Temporarily add to `core.client.ts`:

```ts
  broken(meta: RpcMeta) {
    return this.dispatch('core.auth.loginn', { email: 'a', password: 'b' }, meta);
  }
```

Run: `npm run typecheck --workspace=@jagoan-pos/api-gateway 2>&1 | grep -c "core.auth.loginn"`
Expected: at least `1` — the typo does not compile. **Delete the `broken` method before continuing.**

- [ ] **Step 8: Commit**

```bash
git add apps/api-gateway/src/clients
git commit -m "feat(api-gateway): add typed core client and dedicated clients module"
```

---

## Task 12: `apps/api-gateway` — guards and HTTP routes

The last defect from the review: `JwtStrategy` calls `core.auth.getUserById` over TCP on every authenticated request, putting a network hop and a Postgres read in front of the checkout path the FRD spends its whole argument protecting. Session state is now in Redis, so the common case is one local Redis read and the RPC happens only on a cache miss.

**Files:**
- Create: `apps/api-gateway/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api-gateway/src/common/guards/roles.guard.ts`
- Create: `apps/api-gateway/src/common/decorators/{current-user,roles}.decorator.ts`
- Create: `apps/api-gateway/src/routes/auth/{auth.controller.ts,auth.module.ts,auth.dto.ts}`
- Create: `apps/api-gateway/src/routes/staff/{staff.controller.ts,staff.module.ts,staff.dto.ts}`
- Delete: `apps/api-gateway/src/auth/`, `apps/api-gateway/src/staff/`
- Test: `apps/api-gateway/src/common/guards/jwt-auth.guard.spec.ts`

**Interfaces:**
- Consumes: `CoreClient`, `RedisService`, `cacheKeys`, `jwtPayloadSchema`, `AuthUser`, `Actor`.
- Produces:
  - `JwtAuthGuard` — verifies the JWT, resolves the session, sets `req.user: AuthUser` and `req.jti`
  - `RolesGuard` + `@Roles(...roles)` + `@CurrentUser(field?)`
  - `buildMeta(req): RpcMeta` helper on the request
  - Routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/staff/cashiers`, `POST /api/staff/cashiers`, `PATCH /api/staff/cashiers/:cashierId/status`

- [ ] **Step 1: Write the failing test**

Create `apps/api-gateway/src/common/guards/jwt-auth.guard.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { RedisService } from '@jagoan-pos/redis';
import { CoreClient } from '../../clients/core.client';
import { JwtAuthGuard } from './jwt-auth.guard';

const redis = { getRaw: jest.fn() };
const core = { resolveSession: jest.fn() };
const jwt = { verifyAsync: jest.fn() };

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  merchantId: '22222222-2222-4222-8222-222222222222',
  fullName: 'Bu Tini',
  email: 'butini@example.com',
  role: 'OWNER' as const,
  isActive: true,
};
const payload = { sub: user.id, jti: '44444444-4444-4444-8444-444444444444', role: 'OWNER', merchantId: user.merchantId };

function contextWith(authorization?: string): { ctx: ExecutionContext; req: Record<string, unknown> } {
  const req: Record<string, unknown> = {
    correlationId: 'cid-1',
    headers: authorization ? { authorization } : {},
    header: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: RedisService, useValue: redis },
        { provide: CoreClient, useValue: core },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    guard = moduleRef.get(JwtAuthGuard);
  });

  it('rejects a request with no bearer token', async () => {
    const { ctx } = contextWith();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token that fails signature verification', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const { ctx } = contextWith('Bearer bad.token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // The point of the whole task: the hot path must not call core.
  it('resolves the user from redis without an rpc call', async () => {
    jwt.verifyAsync.mockResolvedValue(payload);
    redis.getRaw.mockResolvedValue(JSON.stringify(user));

    const { ctx, req } = contextWith('Bearer good.token');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(core.resolveSession).not.toHaveBeenCalled();
    expect(req.user).toEqual(user);
    expect(req.jti).toBe(payload.jti);
  });

  it('rejects a session tombstoned as revoked', async () => {
    jwt.verifyAsync.mockResolvedValue(payload);
    redis.getRaw.mockResolvedValue('revoked');

    const { ctx } = contextWith('Bearer good.token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(core.resolveSession).not.toHaveBeenCalled();
  });

  it('falls back to core only when the cache misses', async () => {
    jwt.verifyAsync.mockResolvedValue(payload);
    redis.getRaw.mockResolvedValue(null);
    core.resolveSession.mockResolvedValue(user);

    const { ctx, req } = contextWith('Bearer good.token');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(core.resolveSession).toHaveBeenCalledWith(payload.jti, payload.sub, expect.anything());
    expect(req.user).toEqual(user);
  });

  it('rejects a token whose claims do not match the payload schema', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'not-a-uuid' });
    const { ctx } = contextWith('Bearer good.token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- jwt-auth.guard`
Expected: FAIL — `Cannot find module './jwt-auth.guard'`.

- [ ] **Step 3: Write `src/common/guards/jwt-auth.guard.ts`**

```ts
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RedisService } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import { type AuthUser, type RpcMeta, jwtPayloadSchema } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';

const REVOKED = 'revoked';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    jti?: string;
  }
}

/**
 * Hand-rolled rather than Passport, because the resolution order matters and
 * needs to be readable: verify signature -> read Redis -> only then talk to
 * core. The previous Passport strategy made an RPC call on every request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly core: CoreClient,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const claims = await this.jwt
      .verifyAsync<unknown>(token)
      .catch(() => {
        throw new UnauthorizedException('Invalid or expired token');
      });

    const parsed = jwtPayloadSchema.safeParse(claims);
    if (!parsed.success) throw new UnauthorizedException('Malformed token');
    const payload = parsed.data;

    req.user = await this.resolveUser(payload.jti, payload.sub, {
      correlationId: req.correlationId,
      actor: null,
    });
    req.jti = payload.jti;
    return true;
  }

  private async resolveUser(jti: string, userId: string, meta: RpcMeta): Promise<AuthUser> {
    const cached = await this.redis.getRaw(cacheKeys.session(jti));

    if (cached === REVOKED) throw new UnauthorizedException('Session has been revoked');
    if (cached !== null) return JSON.parse(cached) as AuthUser;

    // Cache miss (eviction, restart, or a session issued before this instance
    // started). Core re-checks the durable revocation table and the user's
    // active flag, then repopulates Redis.
    try {
      return await this.core.resolveSession(jti, userId, meta);
    } catch {
      throw new UnauthorizedException('Session is no longer valid');
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=@jagoan-pos/api-gateway -- jwt-auth.guard`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the decorators and roles guard**

`src/common/decorators/roles.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@jagoan-pos/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

`src/common/decorators/current-user.decorator.ts`:

```ts
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@jagoan-pos/contracts';

export const CurrentUser = createParamDecorator(
  <K extends keyof AuthUser>(field: K | undefined, ctx: ExecutionContext) => {
    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user) throw new Error('CurrentUser used on a route without JwtAuthGuard');
    return field ? user[field] : user;
  },
);
```

The explicit throw replaces the current version's silent `request.user[data]` on `undefined`, which produces a confusing `TypeError` when a guard is forgotten.

`src/common/guards/roles.guard.ts`:

```ts
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@jagoan-pos/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient permission');
    }
    return true;
  }
}
```

`src/common/rpc-meta.ts`:

```ts
import type { Request } from 'express';
import type { RpcMeta } from '@jagoan-pos/contracts';

/** The only place an Actor is constructed — always from the verified session. */
export function buildMeta(req: Request): RpcMeta {
  return {
    correlationId: req.correlationId,
    actor: req.user
      ? { userId: req.user.id, role: req.user.role, merchantId: req.user.merchantId }
      : null,
  };
}
```

- [ ] **Step 6: Write the auth routes**

`src/routes/auth/auth.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import { loginSchema, registerOwnerSchema } from '@jagoan-pos/contracts';

export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterOwnerDto extends createZodDto(registerOwnerSchema) {}
```

`src/routes/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request } from 'express';
import type { AuthUser, LoginResult } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { buildMeta } from '../../common/rpc-meta';
import { LoginDto, RegisterOwnerDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly core: CoreClient) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a merchant and its owner account (FRD US-1.3)' })
  register(@Body(ZodValidationPipe) dto: RegisterOwnerDto, @Req() req: Request): Promise<LoginResult> {
    return this.core.registerOwner(dto, buildMeta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(ZodValidationPipe) dto: LoginDto, @Req() req: Request): Promise<LoginResult> {
    return this.core.login(dto, buildMeta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session so the token cannot be replayed (FRD US-1.2)' })
  async logout(@Req() req: Request): Promise<void> {
    await this.core.revokeSession(req.jti as string, buildMeta(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
```

`src/routes/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { GatewayEnv } from '../../config/env.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Verification only — the gateway never signs. Core owns issuance.
      useFactory: (config: ConfigService<GatewayEnv, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthRoutesModule {}
```

- [ ] **Step 7: Write the staff routes**

`src/routes/staff/staff.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createCashierSchema, setCashierActiveSchema } from '@jagoan-pos/contracts';

export class CreateCashierDto extends createZodDto(createCashierSchema) {}

// cashierId arrives as a path parameter, so the body carries only the flag.
export class SetCashierActiveBodyDto extends createZodDto(
  setCashierActiveSchema.pick({ isActive: true }),
) {}

export const cashierIdParamSchema = z.uuid();
```

`src/routes/staff/staff.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request } from 'express';
import type { CashierListResult, CashierSummary } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { buildMeta } from '../../common/rpc-meta';
import { CreateCashierDto, SetCashierActiveBodyDto } from './staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class StaffController {
  constructor(private readonly core: CoreClient) {}

  // No merchantId parameter anywhere: it comes from the verified session via
  // buildMeta, so the route cannot be pointed at another tenant.
  @Get('cashiers')
  list(@Req() req: Request): Promise<CashierListResult> {
    return this.core.listCashiers(buildMeta(req));
  }

  @Post('cashiers')
  create(
    @Body(ZodValidationPipe) dto: CreateCashierDto,
    @Req() req: Request,
  ): Promise<CashierSummary> {
    return this.core.createCashier(dto, buildMeta(req));
  }

  @Patch('cashiers/:cashierId/status')
  setActive(
    @Param('cashierId', ParseUUIDPipe) cashierId: string,
    @Body(ZodValidationPipe) dto: SetCashierActiveBodyDto,
    @Req() req: Request,
  ): Promise<CashierSummary> {
    return this.core.setCashierActive({ cashierId, isActive: dto.isActive }, buildMeta(req));
  }
}
```

`src/routes/staff/staff.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthRoutesModule } from '../auth/auth.module';

@Module({
  imports: [AuthRoutesModule],
  controllers: [StaffController],
})
export class StaffRoutesModule {}
```

`StaffRoutesModule` imports `AuthRoutesModule` for the guards and the verifying `JwtModule` — a real dependency, unlike the old arrangement where it imported `AuthModule` to borrow a transport token.

- [ ] **Step 8: Delete the old gateway folders**

```bash
rm -rf apps/api-gateway/src/auth apps/api-gateway/src/staff
grep -rn "getUserById\|passport-jwt" apps/api-gateway/src; echo "exit=$?"
```
Expected: no output, `exit=1`. Also drop `passport`, `passport-jwt`, `@nestjs/passport` from `apps/api-gateway/package.json` — the hand-rolled guard replaces them.

- [ ] **Step 9: Verify typecheck and the whole gateway suite**

```bash
npm install && npm run typecheck --workspace=@jagoan-pos/api-gateway && npm test --workspace=@jagoan-pos/api-gateway
```
Expected: typecheck clean; all suites pass.

- [ ] **Step 10: Verify E1 end to end against real Postgres and Redis**

```bash
docker compose up -d
npm run build:packages
npm run start:prod --workspace=@jagoan-pos/core &
npm run start:prod --workspace=@jagoan-pos/api-gateway &
sleep 5

# Register — expect 201 with an accessToken
TOKEN=$(curl -sS -X POST localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"merchantName":"Warung Bu Tini","fullName":"Bu Tini","email":"butini@example.com","password":"correct-horse"}' \
  | tee /dev/stderr | npx --yes json accessToken)

# Authenticated read — expect 200
curl -sS localhost:3000/api/auth/me -H "authorization: Bearer $TOKEN"

# Create a cashier — expect 201
curl -sS -X POST localhost:3000/api/staff/cashiers -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"fullName":"Ani","email":"ani@example.com","password":"cashier-pass"}'

# Log out, then replay the same token — expect 401 (FRD US-1.2)
curl -sS -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/auth/logout -H "authorization: Bearer $TOKEN"
curl -sS -o /dev/null -w '%{http_code}\n' localhost:3000/api/auth/me -H "authorization: Bearer $TOKEN"
```
Expected, in order: a JSON body with `accessToken`; the owner's profile; the created cashier; `204`; `401`.

Then confirm throttling (FRD US-1.1) — six wrong-password attempts, the sixth must return `429`:

```bash
for i in $(seq 1 6); do
  curl -sS -o /dev/null -w "$i: %{http_code}\n" -X POST localhost:3000/api/auth/login \
    -H 'content-type: application/json' \
    -d '{"email":"butini@example.com","password":"wrong-password"}'
done
```
Expected: `401` five times, then `429`.

- [ ] **Step 11: Commit**

```bash
git add apps/api-gateway
git commit -m "feat(api-gateway): redis-backed session guard, typed routes, logout endpoint"
```

---

## Task 13: Rename and scaffold the remaining services

`apps/products-service` becomes `apps/products`. `apps/transactions` already has the directory rename but its `package.json` still says `"name": "transaction-service"` — a half-applied rename that would silently break `--workspace` flags. `apps/analytics-service` is deleted: the AI worker is Python and belongs to FRD E6.

`apps/reports` is new. All three get the same skeleton established in Task 6, booting to a health-check `@MessagePattern` — enough to be started, connected to, and monitored, with no dead domain scaffolding.

**Files:**
- Rename: `apps/products-service/` → `apps/products/`
- Delete: `apps/analytics-service/`
- Create/modify for each of `products`, `transactions`, `reports`:
  - `package.json`, `tsconfig.json`, `nest-cli.json`, `.env.example`
  - `src/main.ts`, `src/app.module.ts`, `src/config/env.schema.ts`, `src/health.controller.ts`
  - `prisma/schema.prisma`, `prisma.config.ts`
- Test: `apps/products/src/health.controller.spec.ts` (one per service)

**Interfaces:**
- Consumes: `validateEnv`, `buildLoggerOptions` from `@jagoan-pos/shared`.
- Produces: workspaces `@jagoan-pos/products` (TCP 4002), `@jagoan-pos/transactions` (TCP 4003), `@jagoan-pos/reports` (TCP 4004), each answering `<service>.health.ping` with `{ service, status: 'ok' }`.

- [ ] **Step 1: Apply the renames and the deletion**

```bash
git mv apps/products-service apps/products
git rm -r --cached apps/analytics-service 2>/dev/null || true
rm -rf apps/analytics-service
rm -rf apps/products/test apps/products/tsconfig.build.json apps/transactions/test apps/transactions/tsconfig.build.json
rm -f apps/products/src/app.controller.ts apps/products/src/app.service.ts apps/products/src/app.controller.spec.ts
rm -f apps/transactions/src/app.controller.ts apps/transactions/src/app.service.ts apps/transactions/src/app.controller.spec.ts
mkdir -p apps/reports/src/config apps/reports/prisma
```

- [ ] **Step 2: Write the failing test (products; repeat verbatim for the other two)**

Create `apps/products/src/health.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('reports the service name and an ok status', () => {
    expect(controller.ping()).toEqual({ service: 'products', status: 'ok' });
  });
});
```

For `transactions` and `reports`, create the identical file under their own `src/`, substituting the service name in the expectation.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test --workspace=@jagoan-pos/products -- health`
Expected: FAIL — the workspace is still `products-service`, and `health.controller` does not exist.

- [ ] **Step 4: Write the health controller (products; repeat for the other two)**

`apps/products/src/health.controller.ts`:

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

const SERVICE = 'products';

@Controller()
export class HealthController {
  @MessagePattern(`${SERVICE}.health.ping`)
  ping(): { service: string; status: 'ok' } {
    return { service: SERVICE, status: 'ok' };
  }
}
```

For `transactions`, set `const SERVICE = 'transactions'` in `apps/transactions/src/health.controller.ts`. For `reports`, `const SERVICE = 'reports'` in `apps/reports/src/health.controller.ts`. Everything else is identical.

- [ ] **Step 5: Write the env schema (products; adapt the prefix for the other two)**

`apps/products/src/config/env.schema.ts`:

```ts
import { z } from 'zod';

export const productsEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PRODUCTS_HOST: z.string().min(1).default('0.0.0.0'),
  PRODUCTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4002),
  PRODUCTS_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  PRODUCTS_DIRECT_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  PRODUCTS_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type ProductsEnv = z.infer<typeof productsEnvSchema>;
```

`apps/transactions/src/config/env.schema.ts` is the same with the `TRANSACTIONS_` prefix and default port `4003`; `apps/reports/src/config/env.schema.ts` uses `REPORTS_` and default port `4004`. `reports` does not use Redis in this plan — omit `REDIS_URL` there.

- [ ] **Step 6: Write `app.module.ts` and `main.ts` (products; adapt for the other two)**

`apps/products/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { resolve } from 'node:path';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { productsEnvSchema } from './config/env.schema';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '..', '.env')],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(productsEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('products')),
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

`apps/products/src/main.ts` is Task 6 Step 8's `main.ts` with `CORE_HOST`/`CORE_TCP_PORT` replaced by `PRODUCTS_HOST`/`PRODUCTS_TCP_PORT`, `CoreEnv` by `ProductsEnv`, and the log line reading `products listening on ...`:

```ts
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { ProductsEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const config = context.get(ConfigService<ProductsEnv, true>);
  const host = config.get('PRODUCTS_HOST', { infer: true });
  const port = config.get('PRODUCTS_TCP_PORT', { infer: true });
  await context.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host, port },
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  await app.listen();
  app.get(Logger).log(`products listening on tcp://${host}:${port}`);
}

void bootstrap();
```

- [ ] **Step 7: Write each `package.json`**

`apps/products/package.json` — the same shape as `@jagoan-pos/core` from Task 6 Step 4, with `"name": "@jagoan-pos/products"` and no `argon2`/`@nestjs/jwt`:

```json
{
  "name": "@jagoan-pos/products",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@jagoan-pos/contracts": "^0.0.1",
    "@jagoan-pos/redis": "^0.0.1",
    "@jagoan-pos/shared": "^0.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@nestjs/microservices": "^11.1.28",
    "@prisma/adapter-pg": "^7.9.1",
    "@prisma/client": "^7.9.1",
    "nestjs-pino": "^4.4.0",
    "nestjs-zod": "^5.5.0",
    "pg": "^8.23.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "dotenv": "^17.4.1",
    "jest": "^30.0.0",
    "prisma": "^7.9.1",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node",
    "moduleNameMapper": { "^generated/(.*)$": "<rootDir>/../generated/$1" }
  }
}
```

`apps/transactions/package.json` is identical with `"name": "@jagoan-pos/transactions"`. `apps/reports/package.json` is identical with `"name": "@jagoan-pos/reports"` and no `@jagoan-pos/redis`.

Each service's `tsconfig.json` and `nest-cli.json` are copies of `apps/core`'s.

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm install
npm test --workspace=@jagoan-pos/products --workspace=@jagoan-pos/transactions --workspace=@jagoan-pos/reports
```
Expected: PASS, 1 test per service.

- [ ] **Step 9: Create a minimal Prisma schema per service**

Each service owns its own database and migration history. The schemas are empty of models for now — the tables arrive with their feature plans — but the datasource, generator, and `prisma.config.ts` wiring must exist so the DB-per-service boundary is real from day one.

`apps/products/prisma/schema.prisma`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

// Catalog models (items, categories, prices) land with FRD E2.
```

`apps/transactions/prisma/schema.prisma` carries the same header, with this comment instead:

```prisma
// Transactions, transaction lines, stock records, and stock movements all
// live here so a sale can decrement stock in one commit (FRD US-3.2, §7.1).
// They arrive with FRD E3/E4.
```

`apps/reports/prisma/schema.prisma`:

```prisma
// Pre-aggregated merchant rollups (FRD E5). Never queried by the checkout path.
```

Each `prisma.config.ts` copies `apps/core`'s, substituting the direct-connection env var (`PRODUCTS_DIRECT_URL`, `TRANSACTIONS_DIRECT_URL`, `REPORTS_DIRECT_URL`) — migrations never run through the pooler.

- [ ] **Step 10: Write each `.env.example`**

`apps/products/.env.example`:

```dotenv
NODE_ENV=development
PRODUCTS_HOST=0.0.0.0
PRODUCTS_TCP_PORT=4002
PRODUCTS_DATABASE_URL=postgresql://products_svc:<password>@aws-0-<region>.pooler.supabase.com:6543/products_db?sslmode=require
PRODUCTS_DIRECT_URL=postgresql://products_svc:<password>@db.<ref>.supabase.co:5432/products_db?sslmode=require
PRODUCTS_DATABASE_POOL_MAX=5
REDIS_URL=redis://:redis_dev_password@localhost:6379
```

`apps/transactions/.env.example` uses the `TRANSACTIONS_` prefix, port `4003`, and `transactions_svc@.../transactions_db`. `apps/reports/.env.example` uses `REPORTS_`, port `4004`, `reports_svc@.../reports_db`, and no `REDIS_URL`. Each carries both a `_DATABASE_URL` and a `_DIRECT_URL`.

Under Route B from Task 5, the pooler cannot reach `products_db`, `transactions_db`, or `reports_db` — set both values to the direct connection for those three and leave `*_DATABASE_POOL_MAX` at 3.

- [ ] **Step 11: Verify every service boots and answers its health pattern**

```bash
for s in products transactions reports; do cp apps/$s/.env.example apps/$s/.env; done
npm run build:packages
npm run build --workspace=@jagoan-pos/products --workspace=@jagoan-pos/transactions --workspace=@jagoan-pos/reports

for s in products transactions reports; do
  ( cd apps/$s && node dist/main.js & )
done
sleep 4
for p in 4002 4003 4004; do nc -z localhost $p && echo "port $p up"; done
pkill -f "apps/.*/dist/main.js"
```
Expected: `port 4002 up`, `port 4003 up`, `port 4004 up`.

- [ ] **Step 12: Verify no stale workspace names survive**

```bash
grep -rn "products-service\|transaction-service\|analytics-service\|core-service" \
  --include="*.json" --include="*.ts" --include="*.yml" --include="Dockerfile" \
  apps packages .github 2>/dev/null; echo "exit=$?"
```
Expected: only hits inside `apps/*/Dockerfile`, which Task 14 rewrites. After Task 14, `exit=1`.

- [ ] **Step 13: Commit**

```bash
git add -A apps
git commit -m "refactor: drop -service suffixes, scaffold reports, remove analytics-service"
```

---

## Task 14: Per-service Dockerfiles and Compose wiring

The existing Dockerfiles reference `--workspace=core-service` and copy `packages/redis`/`packages/shared` by hand. They need the new names, the new `contracts` package, and a non-root user.

**Files:**
- Create: `Dockerfile` (one multi-stage file, parameterized by build arg)
- Delete: `apps/*/Dockerfile`
- Create: `.dockerignore`
- Modify: `docker-compose.yml`

One parameterized Dockerfile rather than five near-identical copies: the build steps differ only by workspace name, and five files drift.

**Interfaces:**
- Consumes: workspace names from Task 13.
- Produces: images `jagoan/<service>:local` for `api-gateway`, `core`, `products`, `transactions`, `reports`. Compose profile `apps` runs all five.

- [ ] **Step 1: Write `.dockerignore`**

```
node_modules
**/node_modules
**/dist
**/generated
**/.env
.git
docs
*.md
```

- [ ] **Step 2: Write the root `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
# Build from the repository root:
#   docker build --build-arg SERVICE=core -t jagoan/core:local .
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS builder
ARG SERVICE
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci \
  && npm run build:packages \
  # Prisma generate is a no-op for services without a schema.
  && if [ -f "apps/${SERVICE}/prisma/schema.prisma" ]; then \
       npm run prisma:generate --workspace=@jagoan-pos/${SERVICE}; \
     fi \
  && npm run build --workspace=@jagoan-pos/${SERVICE} \
  && npm prune --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG SERVICE
ENV NODE_ENV=production
ENV SERVICE=${SERVICE}
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/${SERVICE} ./apps/${SERVICE}
COPY --from=builder /app/package.json ./package.json

# Never run the runtime as root.
USER node

# Shell form so ${SERVICE} is expanded at container start.
CMD node apps/${SERVICE}/dist/main.js
```

```bash
rm -f apps/*/Dockerfile
```

- [ ] **Step 3: Add the application services to `docker-compose.yml`**

Append under `services:` in the file written in Task 5. Config comes from the environment, not from `.env` files — `ignoreEnvFile` in each `app.module.ts` handles that when `NODE_ENV=production`.

```yaml
  core:
    profiles: ["apps"]
    build:
      context: .
      args: { SERVICE: core }
    container_name: jagoan-core
    environment:
      NODE_ENV: production
      CORE_HOST: 0.0.0.0
      CORE_TCP_PORT: 4001
      CORE_DATABASE_URL: ${CORE_DATABASE_URL:?set in your shell or an env_file}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_dev_password}@redis:6379
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
      JWT_EXPIRES_IN_SECONDS: ${JWT_EXPIRES_IN_SECONDS:-3600}
    depends_on:
      redis: { condition: service_healthy }
    restart: unless-stopped

  products:
    profiles: ["apps"]
    build:
      context: .
      args: { SERVICE: products }
    container_name: jagoan-products
    environment:
      NODE_ENV: production
      PRODUCTS_HOST: 0.0.0.0
      PRODUCTS_TCP_PORT: 4002
      PRODUCTS_DATABASE_URL: ${PRODUCTS_DATABASE_URL:?set in your shell or an env_file}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_dev_password}@redis:6379
    depends_on:
      redis: { condition: service_healthy }
    restart: unless-stopped

  transactions:
    profiles: ["apps"]
    build:
      context: .
      args: { SERVICE: transactions }
    container_name: jagoan-transactions
    environment:
      NODE_ENV: production
      TRANSACTIONS_HOST: 0.0.0.0
      TRANSACTIONS_TCP_PORT: 4003
      TRANSACTIONS_DATABASE_URL: ${TRANSACTIONS_DATABASE_URL:?set in your shell or an env_file}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_dev_password}@redis:6379
    depends_on:
      redis: { condition: service_healthy }
    restart: unless-stopped

  reports:
    profiles: ["apps"]
    build:
      context: .
      args: { SERVICE: reports }
    container_name: jagoan-reports
    environment:
      NODE_ENV: production
      REPORTS_HOST: 0.0.0.0
      REPORTS_TCP_PORT: 4004
      REPORTS_DATABASE_URL: ${REPORTS_DATABASE_URL:?set in your shell or an env_file}
    restart: unless-stopped

  api-gateway:
    profiles: ["apps"]
    build:
      context: .
      args: { SERVICE: api-gateway }
    container_name: jagoan-api-gateway
    environment:
      NODE_ENV: production
      GATEWAY_PORT: 3000
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3001}
      CORE_HOST: core
      CORE_TCP_PORT: 4001
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_dev_password}@redis:6379
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
    ports:
      - "${GATEWAY_PORT:-3000}:3000"
    depends_on:
      - core
      - redis
    restart: unless-stopped
```

Only the gateway publishes a port. The four services are reachable only on the Compose network — the FRD's "gateway is the single entry point" made structural.

Each service's `*_DATABASE_URL` and `*_DIRECT_URL` point at Supabase and are **not** defaulted here: add them to your shell environment or a Compose `env_file`, never to a committed file.

Add to `.env.example`:

```dotenv
JWT_SECRET=replace-me-with-at-least-32-characters-of-entropy
JWT_EXPIRES_IN_SECONDS=3600
GATEWAY_PORT=3000
CORS_ORIGINS=http://localhost:3001
```

- [ ] **Step 4: Build one image and verify the runtime user**

```bash
docker build --build-arg SERVICE=core -t jagoan/core:local .
docker run --rm --entrypoint whoami jagoan/core:local
```
Expected: build succeeds; `whoami` prints `node`, not `root`.

- [ ] **Step 5: Bring the full stack up and verify E1 through containers**

```bash
docker compose --profile apps up -d --build
sleep 20
docker compose ps --format '{{.Service}}\t{{.State}}'

curl -sS -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"merchantName":"Compose Test","fullName":"Tester","email":"compose@example.com","password":"correct-horse"}'
```
Expected: all six services `running` (redis plus the five apps); the register call returns `201`.

Migrations run against Supabase from your workstation, not from a container — `npm run prisma:deploy --workspace=@jagoan-pos/core` with `CORE_DIRECT_URL` set. If they have not been applied, the register call returns 500.

- [ ] **Step 6: Verify the services are not reachable from the host**

```bash
nc -z localhost 4001 && echo "LEAKED" || echo "core not exposed"
```
Expected: `core not exposed`.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml .env.example
git add -u apps
git commit -m "chore(docker): one parameterized dockerfile, non-root runtime, compose apps profile"
```

---

## Task 15: CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root scripts from Task 1.
- Produces: a workflow running lint, typecheck, unit tests, migration deploy, and a Docker build on every push and pull request.

CI runs against a **throwaway Postgres service container**, not Supabase. Pointing CI at the shared dev database would let any pull request run `migrate deploy` against it, and would burn Supabase connections on every push. The container exists only to prove the migrations apply to an empty database.

- [ ] **Step 1: Write the workflow**

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-timeout 5s --health-retries 10
      redis:
        image: redis:8-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s --health-timeout 5s --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build shared packages
        run: npm run build:packages

      - name: Create service databases
        env:
          PGPASSWORD: postgres
        run: |
          for db in core products transactions reports; do
            psql -h localhost -U postgres -c "CREATE DATABASE ${db}_db"
          done

      - name: Generate Prisma clients
        run: |
          for s in core products transactions reports; do
            npm run prisma:generate --workspace=@jagoan-pos/$s
          done
        env:
          CORE_DIRECT_URL: postgresql://postgres:postgres@localhost:5432/core_db
          PRODUCTS_DIRECT_URL: postgresql://postgres:postgres@localhost:5432/products_db
          TRANSACTIONS_DIRECT_URL: postgresql://postgres:postgres@localhost:5432/transactions_db
          REPORTS_DIRECT_URL: postgresql://postgres:postgres@localhost:5432/reports_db

      - name: Apply migrations
        run: npm run prisma:deploy --workspace=@jagoan-pos/core
        env:
          CORE_DIRECT_URL: postgresql://postgres:postgres@localhost:5432/core_db

      - run: npm run lint

      - run: npm run typecheck

      - run: npm test

      # Contracts and shared are the layering boundary; a violation here is
      # invisible to tsc because both compile fine on their own.
      - name: Check package layering
        run: |
          if grep -rq "@jagoan-pos/contracts" packages/shared/src; then
            echo "packages/shared must not import @jagoan-pos/contracts"; exit 1
          fi
          if grep -rq "@jagoan-pos/shared" packages/contracts/src; then
            echo "packages/contracts must not import @jagoan-pos/shared"; exit 1
          fi

      # `nest new` scaffolds a standalone tsconfig. Without this, a new service
      # silently opts out of strict mode and nobody notices for months.
      - name: Check every workspace extends tsconfig.base.json
        run: |
          status=0
          for f in apps/*/tsconfig.json packages/*/tsconfig.json; do
            if ! grep -q '"extends".*tsconfig.base.json' "$f"; then
              echo "$f does not extend tsconfig.base.json"; status=1
            fi
          done
          exit $status

      # contracts ships to the browser via the Next.js frontend.
      - name: Check contracts stays browser-safe
        run: |
          if grep -rqE "@nestjs/|node:|process\.env" packages/contracts/src; then
            echo "packages/contracts must not import @nestjs/*, node:*, or read process.env"
            exit 1
          fi

  docker:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        service: [api-gateway, core, products, transactions, reports]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          build-args: SERVICE=${{ matrix.service }}
          push: false
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}
```

- [ ] **Step 2: Verify the same commands pass locally**

```bash
npm run lint && npm run typecheck && npm test
```
Expected: all three clean. If lint fails on generated Prisma output, confirm `**/generated/**` is in the `ignores` array of `eslint.config.mjs`.

- [ ] **Step 3: Commit and confirm the run is green**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, test, migration, and docker build matrix"
git push
gh run watch
```
Expected: both jobs succeed.

---

## Self-review

**Spec coverage.** Every FRD requirement this plan claims:

| FRD | Where it lands |
| --- | --- |
| US-1.1 login | Tasks 8 (timing, throttle), 12 (route, 429 verification) |
| US-1.1 error does not reveal email existence | Task 8, dummy-hash verification |
| US-1.2 logout, token rejected on replay | Tasks 7 (revocation), 12 (`POST /auth/logout`, 401 verification) |
| US-1.3 register merchant + owner, logged in | Task 8 (`registerOwner` issues a session) |
| US-1.4 create cashier bound to merchant | Tasks 9 (repository), 12 (route) |
| US-1.4 other merchants' cashiers never listed | Task 9, `listCashiers` scoping test |
| US-1.5 deactivate, access lost immediately | Task 9 (`revokeAllForUser` on deactivate) |
| AR-1 identity resolves to `{user_id, role, merchant_id}` | Task 2 (`Actor`), Task 12 (`buildMeta`) |
| AR-2 tenant scoping at the data layer | Task 9 (`StaffRepository`) |
| AR-3 cross-merchant returns not-found | Tasks 9 (null → `CASHIER_NOT_FOUND`), 10 (404 mapping) |
| AR-5 deactivated sessions die at next request | Tasks 7, 9 |
| §7.1 narrow write path, no cross-service hop on the hot path | Task 12 (Redis-first session guard) |

**Deliberately not covered, and why:** US-1.6 (admin manages owners/admins) and E7 merchant lifecycle have no `merchants`/`users` admin module here — they are E7 feature work, not foundation. E2–E6 are named in "Out of scope" above.

**Type consistency.** `AuthUser` is defined once in `packages/contracts/src/rpc.ts` and imported everywhere. `CashierSummary.createdAt` is `string` in the contract and `Date` in `CashierRow`; `toSummary` in Task 9 is the single conversion point. `cacheKeys.session` is used identically by `SessionService` (Task 7) and `JwtAuthGuard` (Task 12), and both compare against the same `'revoked'` sentinel. `RpcMeta` is constructed only by `buildMeta` (Task 12) and consumed only by `TypedClient.dispatch` (Task 11).

**Ordering.** Tasks 2–4 must precede 6–13. Task 10 leaves `app.module.ts` referencing modules that Tasks 11 and 12 create, so 10–12 land together before the gateway typechecks. Task 13 must precede 14 (Dockerfile depends on the new workspace names).

---

## Risks worth naming before you start

1. **Two `.env` files must share `JWT_SECRET`.** Core signs, the gateway verifies. Per-service env config makes this a manual pairing, and a mismatch shows up only as a 401. It is asserted at boot by both env schemas requiring 32+ characters, but not that they match.

2. **Six Node processes plus Postgres on one VM.** Gateway + 4 services ≈ 150 MB RSS each at idle. Budget 2 GB minimum, and size `*_DATABASE_POOL_MAX` against Supabase's connection ceiling — four services at 10 each is 40 connections before the frontend does anything.

3. **There is no local database.** Every developer's `npm run start:dev` writes to Supabase, so two people running the E1 verification in Task 12 will collide on `butini@example.com` and on the login-attempt counter. Either give each developer their own Supabase project, or namespace the test emails. This is the cost of dropping local Postgres and it will show up on day one, not at deploy.

4. **Route B leaves three services unpooled.** If you put all four databases in one Supabase project, only `core` gets Supavisor. The other three hold direct connections for the process lifetime — three services at `POOL_MAX=3` is nine persistent connections before any traffic. Check your plan's direct-connection ceiling against that number.

5. **`contracts` is now a frontend dependency.** A breaking schema change stops being a backend-only concern: it breaks the Vercel build too. Two mitigations worth adopting early — keep Zod pinned to the same major in both `package.json` files, and make Vercel's build command run `npm run build:packages` first, since `apps/web` imports built output rather than source.

6. **`revoked_tokens` cleanup is opportunistic.** It runs on every `revoke` call. At this volume that is fine; if logout traffic ever drops to near zero while token issuance stays high, expired rows accumulate. A scheduled sweep is the fix, not needed yet.

7. **The login throttle counts per email, not per IP.** It stops credential stuffing against one account but not spraying across many. Per-IP throttling belongs at the gateway; FRD US-1.1 only specifies the per-account rule.
