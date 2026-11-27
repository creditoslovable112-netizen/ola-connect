<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Resolve PRO access only through the authenticated `public.has_active_pro_subscription()` bridge to the existing private rule; keep its fixed boolean result, empty search path, no caller-supplied identity, no anonymous execution and no private-schema grants because this preserves authorization and expiry without exposing financial records. Its authenticated SECURITY DEFINER linter warning is intentional for this narrowly scoped bridge.
- Share one `useProAccess` result between module gates and the subscription screen, revalidating on session credentials, navigation, focus and a bounded interval because independent or stale client state must not override database entitlement.
- Both finance dashboards share presentation-only charts fed by their existing totals and monthly series; keep fetching, financial calculations and entitlement gates in their existing owners to prevent divergent data or access rules.
- Keep app-wide presentation in the global semantic tokens and shared styles, and use AnimatedAmount only to display existing totals; this keeps visual changes independent of queries, authorization and payment logic.
