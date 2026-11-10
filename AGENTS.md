# AGENTS.md: Developer & Agent Operating Memory for WATeamInbox

> **CRITICAL INSTRUCTIONS FOR ALL CODING AGENTS & DEVELOPERS**  
> *Always review these architectural invariants before writing code, proposing migrations, or executing refactors in this repository.*

---

## 1. System Architecture Quick Reference

- **Type**: Multi-tenant, omnichannel collaborative team inbox.
- **Frontend**: React 19, Vite, Tailwind CSS, TanStack Query, Zustand (`apps/web`).
- **Backend API**: Hono running on Bun (`apps/api`).
- **Realtime**: Centrifugo WebSocket push server (`:4451`).
- **Event Bus & Outbox**: NATS JetStream (`:4448`).
- **Database**: PostgreSQL 18 (`:4447`) with Kysely ORM and 110 schema migrations (`packages/database`).
- **Media Storage**: MinIO S3-compatible storage (`:4450`) with pre-signed URLs.
- **WhatsApp Runtime**: Go micro-workers running `whatsmeow` supervised by a Go orchestrator (`services/orchestrator`).
- **AI Agent Protocol**: Built-in Model Context Protocol (MCP) server at `/api/mcp` for Claude, ChatGPT, Gemini, and Cursor.

For in-depth architectural specifications and diagrams, see [`docs/architecture/codebase-memory.md`](file:///Users/m.yousaf/Documents/NHC360/WaTeamInbox%20-whatsapp/docs/architecture/codebase-memory.md).

---

## 2. Invariant Rules & Architectural Boundaries

### 2.1 Multi-Tenancy Isolation
- Cross-tenant data (users, companies, company memberships, auth sessions, API tokens, OAuth grants) **only** exists in the `public` schema.
- All conversational and operational data (conversations, messages, contacts, connections, notes, tags, cases, audit logs) **must** reside in isolated `tenant_<uuid>` schemas.
- **NEVER** write a query that joins across different tenant schemas.
- Whenever adding a new tenant table or column, update `packages/database/src/tenant-schema.ts` (`TENANT_SCHEMA_CONTRACT`). Migrations fail if TypeScript models and runtime schema contracts diverge.

### 2.2 Channel-Neutral Spine Principles
- Do not build features that tightly couple generic inbox logic to WhatsApp JIDs or WhatsApp connection IDs.
- Always program against:
  - `channel_accounts`
  - `channel_customer_endpoints`
  - `conversations`
  - `channel_messages`
  - `channel_attachments`
- Use the adapter boundary (`packages/adapter-telegram` or `packages/shared/src/channel-spine`) for provider-specific normalization and capability advertising.

### 2.3 Strict Package Compilation Order
Internal workspace packages export from their `dist/` directories. If changes are made to shared packages, rebuild in this strict order:
```bash
bun run --filter @wateaminbox/shared build
bun run --filter @wateaminbox/database build
bun run --filter @wateaminbox/adapter-telegram build
bun run --filter @wateaminbox/ui build
```

### 2.4 Go Worker & macOS Code-Signing
- When building `services/whatsapp/whatsapp-worker` on macOS, the binary must be ad-hoc re-signed to avoid being SIGKILLed by Gatekeeper:
  ```bash
  (cd services/whatsapp && go build -o whatsapp-worker main.go && codesign --force --sign - whatsapp-worker)
  ```

### 2.5 Email In Local Development
- By default, `MAIL_DRIVER=log` in `.env`. Outgoing transactional emails (verification emails, invites, password resets) are printed directly to `logs/api.log`. Do not treat missing inbox delivery as an error unless `MAIL_DRIVER=resend` or `cloudflare` is explicitly configured.

### 2.6 Frontend Component Policies
- **Single-choice dropdowns**: Must use `Select` components from `@/components/ui/select`. Never import Radix Select directly (enforced by `select-policy.test.ts`).
- **Route chunks**: Handled dynamically with Vite and manual preload hints (`vite.config.ts`).

---

## 3. Essential Commands & Runbook

| Operation | Command |
| :--- | :--- |
| **Start full dev environment** | `./dev-start.sh` |
| **Run all database migrations** | `bun run db:migrate` |
| **Run typecheck across monorepo** | `bun run typecheck` |
| **Run unit & integration tests** | `bun test` |
| **Monitor API server logs** | `tail -f logs/api.log` |
| **Monitor WhatsApp worker logs** | `tail -f logs/whatsapp-worker.log` |
| **Monitor orchestrator logs** | `tail -f logs/orchestrator.log` |
| **Reconcile spine indexes** | `bun run apps/api/src/scripts/reconcile-channel-spine-indexes.ts` |

