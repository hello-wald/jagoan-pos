import { expect, test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@jagoan.test', password: 'rahasia123' };
const CASHIER = { email: 'kasir@jagoan.test', password: 'rahasia123' };

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test('a cashier never sees catalog content before the 403', async ({ page }) => {
  await login(page, CASHIER);

  const headings: string[] = [];

  await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
  headings.push(...(await page.locator('h1').allTextContents()));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Halaman ini bukan untuk peran Anda',
  );

  // The edge gate's whole point: protected markup is never sent, not merely
  // hidden after render. Approach A could not have passed this.
  expect(headings.join(' ')).not.toContain('Katalog Produk');
  expect(await page.content()).not.toContain('Katalog Produk');
});

test('full catalog loop: create, search, deactivate, reactivate', async ({ page }) => {
  await login(page, ADMIN);

  const sku = `E2E.${Date.now()}`;
  await page.goto('/admin/products/new');
  await page.getByLabel('Nama produk').fill('Mie Ayam Spesial');
  await page.getByLabel('SKU').fill(sku);
  await page.getByLabel('Kategori (opsional)').fill('Mie');
  await page.getByLabel('Harga').fill('25000');
  await page.getByRole('button', { name: 'Simpan' }).click();

  await page.waitForURL('/admin/products');
  await page.getByLabel('Cari produk').fill(sku);

  const row = page.getByRole('row', { name: new RegExp(sku) });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Rp');
  await expect(row).toContainText('25.000');
  await expect(row).toContainText('Aktif');

  await row.getByRole('button', { name: 'Nonaktifkan' }).click();
  await row.getByRole('button', { name: 'Ya, nonaktifkan' }).click();
  await expect(row).toContainText('Nonaktif');

  await row.getByRole('button', { name: 'Aktifkan' }).click();
  await expect(row).toContainText('Aktif');
});

test('a duplicate SKU errors on the field, not in a toast', async ({ page }) => {
  await login(page, ADMIN);

  const sku = `DUP.${Date.now()}`;
  for (const attempt of [1, 2]) {
    await page.goto('/admin/products/new');
    await page.getByLabel('Nama produk').fill(`Duplikat ${attempt}`);
    await page.getByLabel('SKU').fill(sku);
    await page.getByLabel('Harga').fill('10000');
    await page.getByRole('button', { name: 'Simpan' }).click();
    if (attempt === 1) await page.waitForURL('/admin/products');
  }

  // The message must be bound to the input, not floating in a toast.
  const skuInput = page.getByLabel('SKU');
  await expect(skuInput).toHaveAttribute('aria-invalid', 'true');
  await expect(skuInput).toHaveAccessibleDescription('SKU ini sudah dipakai produk lain.');
  await expect(page).toHaveURL(/\/admin\/products\/new/);
});
