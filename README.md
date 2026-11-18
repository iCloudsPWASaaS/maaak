# MAAAK Matrimony Platform

MAAAK is a premium, API-first Islamic matrimony platform built with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, and a custom session/auth layer. The same versioned REST API serves the Next.js web app and future Flutter mobile clients.

## Product scope

- Public marketing pages, FAQ, plans, contact, privacy, and terms
- Custom registration, login, email/mobile verification, and password reset flows
- Profile wizard built from the 66-question `profile.xlsx` workbook catalog
- Preferences, dealbreakers, curated discovery, likes, dislikes, and introduction requests
- Compatibility scoring and stable matching using Gale-Shapley with dealbreaker gates
- Maximum 3 active chats, private conversations, Pusher real-time events, and Agora audio/video calls
- Stripe subscriptions with Premium first month free and Premium Plus marked `COMING SOON`
- Didit identity verification with signed webhook validation
- Reports, blocks, feedback, account pause/deactivate/GDPR deletion, and audit logs
- Admin CMS for users, moderation, matching, CMS content, audit, subscriptions, verifications, and feedback

## Architecture

```text
Browser / Flutter
        |
        v
/api/v1/*  (versioned REST API, standard envelope)
        |
        v
services/* (all business rules and orchestration)
        |
        v
supabase/* + Stripe + Didit + Pusher + Agora
        |
        v
matrimony PostgreSQL schema and Supabase Storage
```

Key architectural rules:

- Supabase Auth is intentionally not used. Authentication is handled in `matrimony.users`, `matrimony.auth_sessions`, and `matrimony.verification_codes`.
- All product tables live in the `matrimony` schema, never in `public`.
- API responses use `{ success, message, data, meta }` on success and `{ success: false, message, errors }` on failure.
- Business logic belongs in `services/`. Route handlers should remain thin.
- Browser clients receive sensitive data only through server-validated endpoints.

## Requirements

- Node.js 20+
- npm 10+
- Supabase project with PostgreSQL and Storage
- Stripe account for subscription billing
- Didit account for identity verification
- Pusher Channels account for real-time messaging
- Agora account for audio/video calling

## Quick start

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Never commit this file.

```bash
npm run setup:db
npm run seed:admin
npx tsx --env-file=.env.local scripts/seed-questions.ts
npm run dev
```

Open:

- Web app: `http://localhost:3000`
- API docs: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/openapi.json`
- Admin area: `http://localhost:3000/admin`
- Postman collection: `public/postman/MAAAK_API_v1.postman_collection.json`

The default admin email and password come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Change them immediately after first login.

## Environment variables

See `.env.example` for the complete template.

| Group | Variables | Purpose |
| --- | --- | --- |
| Site/security | `NEXT_PUBLIC_SITE_URL`, `JWT_SECRET` | Base URL and JWT signing |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_SCHEMA`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` | Database and photo storage |
| Admin | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_KEY` | Bootstrap admin and server-to-server admin key |
| Didit | `DIDIT_ENABLED`, `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_BASE_URL`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_CALLBACK` | Identity verification |
| Agora | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE_KEY`, `NEXT_PUBLIC_AGORA_APP_ID` | Calls |
| Pusher | `ALLOW_PUSHER`, `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER`, `NEXT_PUBLIC_PUSHER_APP_KEY`, `NEXT_PUBLIC_PUSHER_APP_CLUSTER` | Real-time messaging |
| Stripe | `STRIPE_ENABLED`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_PREMIUM_PLUS_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_CUSTOMER_PORTAL_ENABLED` | Subscriptions and billing portal |
| Email | `FEEDBACK_RECIPIENT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Feedback and transactional email configuration |

Production webhook URLs:

- Stripe: `https://your-domain/api/v1/webhooks/stripe`
- Didit: `https://your-domain/api/v1/webhooks/didit`

The Didit user return callback is implemented at `/user/verify-id/callback`.

## npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build using Webpack |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run unit tests with Node's test runner through `tsx` |
| `npm run setup:db` | Apply database migrations and prepare storage |
| `npm run seed:admin` | Bootstrap admin account and sample data |

`npm run dev` and `npm run build` use Webpack because Turbopack native bindings are not available on this Windows environment. Webpack dev and production builds are fully verified.

## Database and migrations

- `supabase/migrations/0001_init_matrimony_schema.sql` creates the `matrimony` schema, tables, indexes, triggers, RLS policies, grants, and PostgREST exposure.
- `supabase/migrations/0002_seed_matrimony_data.sql` seeds admin roles, subscription plans, CMS settings, and question categories.
- `scripts/seed-questions.ts` seeds the 66 workbook questions and their options. Scripts should be run only after migrations succeed.

Core tables include users, sessions, verification codes, profiles, profile answers, photos, preferences, dealbreakers, compatibility scores, recommendations, likes/dislikes, introduction requests, conversations, messages, notifications, identity verification sessions, subscriptions, payments, reports, blocks, feedback, CMS content, and audit logs.

## API

All functional endpoints are versioned under `/api/v1`. Authentication uses either an `Authorization: Bearer <access_token>` header or the secure HTTP-only access cookie.

Success shape:

```json
{
  "success": true,
  "message": "Done",
  "data": {},
  "meta": {}
}
```

Failure shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Main endpoint groups:

- `/auth`: register, login, logout, refresh, verify email/mobile, forgot/reset password
- `/profiles`, `/profile-questions`, `/preferences`, `/dealbreakers`
- `/matches`, `/explore`
- `/requests`, `/conversations`, `/calls`, `/pusher/auth`
- `/subscriptions`, `/webhooks/stripe`
- `/verification`, `/webhooks/didit`
- `/notifications`, `/reports`, `/blocks`, `/account`, `/feedback`
- `/cms`, `/admin`

Admin endpoints accept either an admin/moderator user session or the `X-Admin-Api-Key` header for trusted server-to-server tooling. Browser clients must use authenticated admin sessions.

## Matching engine

The matching rules live in `services/matching-service.ts` and are driven by catalog data in `lib/workbook-catalog.ts`.

- Family and future: 25%
- Relationship intention: 20%
- Values: 20%
- Dating as a parent: 15%
- Personality: 10%
- Lifestyle preferences: 10%
- Dealbreakers are pass/fail gates outside the score
- Maximum 5 dealbreakers, no duplicates, supported codes only
- Unanswered fields are unknown, not incompatible
- No preference must not create negative scoring
- Final allocation runs Gale-Shapley and checks blocking pairs

Useful test command for a live batch run:

```bash
npx tsx --env-file=.env.local -e "import { executeBatchMatchingRun } from './services/matching-service'; executeBatchMatchingRun('batch').then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exit(1); });"
```

## Frontend map

- `app/(public)`: marketing and static content
- `app/(auth)`: login and register
- `app/(user)`: authenticated member experience
- `app/admin`: admin CMS
- `app/api/docs` and `app/api/openapi.json`: API documentation
- `components/AdminShell.tsx`, `components/UserShell.tsx`: shared navigation shells
- `components/SecurityProtectionLayer.tsx`: copy/capture deterrents and watermark helper
- `components/FeedbackBubble.tsx`: global feedback widget

## Subscriptions

- FREE: up to 10 introduction requests
- PREMIUM: unlimited introduction requests, first month free through Stripe trial
- PREMIUM PLUS: `COMING SOON`, not purchasable
- Plan copy, pricing display, and feature text are CMS-managed
- Stripe webhook is the authoritative source for plan state

No raw card details are stored by MAAAK.

## Identity verification

- Didit sessions are created server-side.
- Signed webhook validation uses canonical JSON, HMAC-SHA256, and a timestamp window.
- Webhook processing is idempotent.
- The user return page at `/user/verify-id/callback` only reports status; it never changes account state.
- Account status changes only after a valid signed webhook is processed.

## Real-time messaging and calls

- Pusher private user channels: `private-user-<user_id>`
- Pusher private conversation channels: `private-conversation-<conversation_id>`
- `/api/v1/pusher/auth` validates ownership or conversation participation before signing subscriptions.
- Messaging enforces the maximum 3 active chats rule.
- Calls are initiated through `/api/v1/calls` and joined through `/calls`.

## Safety and compliance

- RLS policies restrict direct schema access.
- Reports, blocks, feedback, and audit logs are persisted.
- Pause, deactivate, and GDPR deletion flows are available under `/settings`.
- Photos are stored in the dedicated `matrimony` Supabase Storage bucket.
- Security headers are added by `middleware.ts`.

## Testing and verification

Run all checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Current test coverage includes:

- Workbook catalog integrity and compatibility weights
- Dealbreaker validation and semantics
- Compatibility scoring and eligibility gates
- Gale-Shapley allocation stability and blocking pair detection
- JWT signing/verification and tamper rejection
- Password hashing and OTP generation
- Didit canonical JSON and webhook signature validation

## Deployment

1. Create a Supabase project and configure environment variables.
2. Run `npm run setup:db` against the production project.
3. Run `npm run seed:admin` and immediately rotate the admin password.
4. Seed workbook questions.
5. Configure Stripe prices and webhook endpoint.
6. Configure Didit workflow and webhook secret.
7. Configure Pusher and Agora credentials.
8. Deploy the Next.js app with `npm run build && npm run start`.
9. Set `NEXT_PUBLIC_SITE_URL`, Stripe success/cancel URLs, and Didit callback to the production domain.

## Production hardening checklist

- Rotate every key that was shared during development.
- Keep `.env.local` out of source control and secret scanning.
- Replace the custom Agora token helper with official Agora RTC token generation if required by your Agora project settings.
- Configure a real email delivery provider for SMTP-backed messages.
- Add a browser push service worker if browser push notifications are required.
- Monitor Stripe and Didit webhook failures with alerts.
- Review RLS policies and admin API key usage before public launch.

## Handover notes

- The workbook catalog is the single source of truth for question text, options, and dealbreaker definitions.
- Business rules should not be duplicated in UI components.
- New API endpoints must be added to `lib/openapi-spec.ts` and the Postman collection.
- Any change to matching weights or dealbreaker semantics must be covered by tests in `tests/matching.test.ts`.
- All admin pages are under `/admin` and use `components/admin/AdminUi.tsx` for shared presentation.
