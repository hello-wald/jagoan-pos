/**
 * Required fixtures
 * ------------------
 * These specs exercise the real running app against a real running gateway
 * (see playwright.config.ts — baseURL http://localhost:3001, backed by
 * GATEWAY_URL, default http://localhost:3000/api). They are NOT hermetic:
 * they need a live stack plus pre-seeded accounts. There is currently no
 * seed script in this repo, and the only self-service account creation
 * path is POST /register, which creates an OWNER + a new merchant — it
 * cannot produce a GLOBAL_ADMIN or a CASHIER account. Until a seed script
 * or fixture endpoint exists, run this file only after seeding, by hand or
 * via a future fixture, the following accounts:
 *
 *   - admin@jagoan.test / rahasia123  — role GLOBAL_ADMIN
 *   - kasir@jagoan.test / rahasia123  — role CASHIER (used by catalog.spec.ts)
 *
 * Without those accounts these specs fail on the login step with a clear
 * assertion mismatch (wrong URL / wrong role landing page), not a timeout.
 */
import { expect, test } from '@playwright/test';

const ADMIN = { email: 'admin@jagoan.test', password: 'rahasia123' };

test('an anonymous visitor is sent to login with a return path', async ({ page }) => {
  await page.goto('/admin/products');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fproducts/);
});

test('a wrong password never reveals whether the email exists', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill('salah-sekali');
  await page.getByRole('button', { name: 'Masuk' }).click();

  // getByRole('alert') alone matches two elements in a real browser: the
  // app's Banner AND Next's own route-announcer div, which also carries
  // role="alert". Scope to the one with the actual message.
  const alert = page.getByRole('alert').filter({ hasText: 'Email atau kata sandi salah.' });
  await expect(alert).toHaveText('Email atau kata sandi salah.');
});

test('an admin lands on the catalog and the token is not readable from JS', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL('/admin/products');
  // The central security claim of approach C, asserted rather than assumed.
  expect(await page.evaluate(() => document.cookie)).not.toContain('jps_session');
});
