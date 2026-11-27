# Database connection strategy (serverless)

## Current architecture

NEXUS uses `@supabase/supabase-js` in the browser and Supabase Edge Functions. Queries go through the Supabase Data API (PostgREST) over HTTPS. The application does not use a PostgreSQL wire-protocol driver, Prisma, Drizzle, or a direct `DATABASE_URL` connection.

Consequences:
- Browser requests do not hold PostgreSQL sockets.
- Edge Functions using `supabase-js` do not create one PostgreSQL connection per invocation.
- PostgreSQL connection pooling is managed by Supabase infrastructure, not by a client-side `max: 1` setting.
- Do not add a direct Postgres driver or Prisma Accelerate solely to pool these Data API requests.

## Pooler choice

For any future serverless/edge workload that must use the PostgreSQL wire protocol, use the project's Supavisor **transaction-mode** connection string from Supabase Dashboard > Connect > Transaction pooler (port 6543). Never construct the pooler hostname manually and never commit credentials.

For a driver such as Postgres.js, initialize one client at module scope per warm isolate and use conservative settings:
- `max: 1` initially (increase only after measuring per-isolate queueing).
- `prepare: false` with Supavisor transaction mode.
- `ssl: 'require'`.
- Close the client only when the runtime is actually shutting down; do not open and close a pool on every request.

Do not use transaction mode for session-dependent features such as session-level SET state, LISTEN/NOTIFY, temporary tables across transactions, or advisory locks. Use a separately justified session-mode/direct connection for those cases.

## Idle connections and limits

Supavisor transaction mode returns a backend connection to its pool after each transaction and closes unused backend connections after its idle timeout. Keep application-side pools small because each warm serverless isolate may have its own pool.

Monitor Supabase Database > Observability > Database Connections and the pooler client-connection charts. Alert before reaching the database max; reserve capacity for Auth, PostgREST, Storage, Realtime, cron, and other Supabase services. Do not raise the pool size without checking the compute plan's max connections and current utilization.

## Current verification snapshot

At the time of this review, `pg_stat_activity` reported 17 total connections against `max_connections = 60`, 1 active connection, 8 idle connections, and 0 idle-in-transaction connections. These are a point-in-time sample, not a load test or a guarantee under peak traffic.

The reminder Edge Function now reuses one stateless `supabase-js` Data API client per warm isolate rather than constructing separate verifier/admin clients on every invocation. This reduces redundant client objects; it does not create or configure a PostgreSQL socket pool.

## Operational rule

If a future change introduces `postgres`, `pg`, Prisma, Drizzle, or another direct SQL driver in an Edge Function, require a review of the connection string, transaction-mode compatibility, per-isolate pool size, TLS, and cleanup before merging.
