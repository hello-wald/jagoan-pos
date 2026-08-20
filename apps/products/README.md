# Products Service

Products Service owns the global, administrator-managed catalog. It uses a
separate PostgreSQL database and communicates with the API Gateway over Nest TCP.

## Environment

```env
PRODUCTS_HOST=0.0.0.0
PRODUCTS_TCP_PORT=4002
PRODUCTS_DATABASE_URL=postgresql://... # pooled runtime URL
PRODUCTS_DIRECT_URL=postgresql://...   # direct URL, migrations only
```

`PRODUCTS_DATABASE_URL` must point to the database owned by this service. In
production, use the pooled connection URL from the dedicated Supabase project.

## Database migration

Run migrations with a direct PostgreSQL connection before releasing a version
that includes a migration:

```bash
cd apps/products
PRODUCTS_DIRECT_URL='postgresql://...' npx prisma migrate deploy
```

## Gateway API

Every endpoint requires a `GLOBAL_ADMIN` bearer token.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/products` | Create a global product |
| `GET` | `/api/admin/products` | List or search products |
| `GET` | `/api/admin/products/:productId` | Get product detail |
| `PATCH` | `/api/admin/products/:productId` | Update name, SKU, category, or price |
| `PATCH` | `/api/admin/products/:productId/status` | Activate or deactivate a product |
| `DELETE` | `/api/admin/products/:productId` | Always rejected; use deactivation |
| `POST` | `/api/admin/products/:productId/images/upload-url` | Create a short-lived direct-upload URL |
| `POST` | `/api/admin/products/:productId/images/:imageId/complete` | Verify and publish an uploaded image |
| `DELETE` | `/api/admin/products/:productId/images/:imageId` | Delete a product image |
| `POST` | `/api/admin/categories` | Create a category |
| `GET` | `/api/admin/categories` | List categories with product counts |
| `GET` | `/api/admin/categories/:categoryId` | Get category detail |
| `PATCH` | `/api/admin/categories/:categoryId` | Rename a category |
| `PATCH` | `/api/admin/categories/:categoryId/status` | Activate or deactivate a category |

`GET /api/admin/products` accepts `query`, `page`, `pageSize`, `activeOnly`, and
`categoryId`. Passing `categoryId=none` returns only the products that have no
category, which a plain absent `categoryId` cannot express.

## Categories

Categories are a table, not a free-text field: `products.category_id` is a
restricted foreign key into `categories`. Names are unique, case-insensitively,
in both the application and PostgreSQL.

There is no delete endpoint. A category in use is referenced by products that
must keep resolving, so retiring one is a deactivation — it stops being offered
when categorizing a product, while products already filed under it are
untouched. The `20260820000000_add_product_categories` migration creates the
table, promotes every distinct legacy `products.category` string into a row
(collapsing casing variants), repoints the products at it, and drops the old
column.

A rename changes a name embedded in cached product payloads, so category writes
invalidate the cached product detail entries of that category and bump the
product-list cache version.

## Product images

Products uses a private Supabase Storage bucket. Create the `product-images` bucket in the
**Products** Supabase project, set its CORS policy to allow the frontend origin, and configure
`SUPABASE_PRODUCTS_URL` plus `SUPABASE_PRODUCTS_SERVICE_ROLE_KEY` only in the Products runtime.
The service role key must never be placed in frontend environment variables.

The browser upload sequence is:

1. Request `POST /api/admin/products/:productId/images/upload-url` with `fileName`,
   `contentType` (`image/jpeg`, `image/png`, or `image/webp`), and `sizeBytes` (maximum 5 MiB).
2. Upload the file directly to the returned Supabase signed URL/token.
3. Call `POST /api/admin/products/:productId/images/:imageId/complete`.

Only verified, completed images are returned in product detail and list responses. Product data
is cached in Redis; writes and image changes invalidate the relevant detail and list caches.

SKU values are normalized to uppercase. Both application logic and PostgreSQL
enforce global uniqueness, and PostgreSQL rejects non-positive prices.
