# Supabase — NEXUS FINANCE

The frontend is configured to use the Supabase project `nexus-finance`.

- Project ref: `obaxshuklmrwjplvvhpd`
- Region: `sa-east-1` (São Paulo)
- Client package: `@supabase/supabase-js@2.119.2`
- Public API URL: `https://obaxshuklmrwjplvvhpd.supabase.co`

## Environment variables

The client has the project URL and publishable key as safe public defaults for the connected project. Lovable deployments can override them with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only use the publishable key in the browser. Never place a Supabase secret key, legacy `service_role` key, or database password in frontend code or Vite environment variables.

## Database

Typed schema definitions are generated in `src/lib/database.types.ts`. The client is initialized in `src/lib/supabase.ts`, and typed data-access functions for accounts, categories, cost centers, and transactions are in `src/lib/finance-data.ts`.

The database currently contains `profiles`, `financial_accounts`, `categories`, `cost_centers`, and `transactions`. Row Level Security is enabled on all five tables. Policies scope user data to `auth.uid()`.

## Important next step

The existing dashboard and several finance screens still contain demonstration data and local component state. The client and typed CRUD functions are now available, but those screens must be migrated to call the functions before their forms and charts persist real user data. Authentication UI and account onboarding also need to be enabled before real users can create financial records.
