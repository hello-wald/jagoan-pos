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

SKU values are normalized to uppercase. Both application logic and PostgreSQL
enforce global uniqueness, and PostgreSQL rejects non-positive prices.
