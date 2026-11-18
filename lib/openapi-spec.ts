export function getOpenApiSpecification() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    openapi: "3.0.3",
    info: {
      title: "MAAAK – Premium Islamic Matrimony Platform REST API",
      version: "1.0.0",
      description:
        "Headless, API-first backend for the MAAAK Matrimony Web (Next.js) and Mobile (Flutter) applications. Uses the dedicated `matrimony` PostgreSQL schema in Supabase, Gale-Shapley stable matching, ME → WHAT I WANT → WHAT I REQUIRE framework, Stripe billing, Didit identity verification, Pusher real-time messaging, and Agora calling.",
      contact: {
        name: "MAAAK Engineering & Support",
        email: "info@maaak.co.uk",
      },
    },
    servers: [
      {
        url: `${baseUrl}/api/v1`,
        description: "Version 1 REST API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Pass the JWT accessToken returned by POST /auth/login or POST /auth/register as `Authorization: Bearer <accessToken>` (used by Flutter mobile and API clients).",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "maaak_access_token",
          description: "HttpOnly session cookie automatically set for Next.js web clients.",
        },
        adminApiKey: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Api-Key",
          description: "Server-to-server administrative API key.",
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: "object",
          required: ["success", "message", "data"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully" },
            data: { type: "object" },
            meta: { type: "object", nullable: true },
          },
        },
        StandardErrorResponse: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "Invalid email address" },
                },
              },
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: [
            "firstName",
            "lastName",
            "username",
            "gender",
            "dob",
            "email",
            "mobileNumber",
            "password",
            "city",
            "postcode",
            "acceptTerms",
            "acceptSubscriptionDisclosure",
          ],
          properties: {
            firstName: { type: "string", example: "Zayd" },
            lastName: { type: "string", example: "ibn Harithah" },
            username: {
              type: "string",
              pattern: "^[A-Za-z0-9]{5,10}$",
              example: "zayd2026",
            },
            gender: { type: "string", enum: ["Male", "Female"], example: "Male" },
            dob: { type: "string", format: "date", example: "1993-05-15" },
            email: { type: "string", format: "email", example: "zayd@example.com" },
            mobileNumber: { type: "string", example: "+447700900555" },
            password: { type: "string", minLength: 8, example: "StrongPass#2026" },
            city: { type: "string", example: "London" },
            postcode: { type: "string", example: "SW1A 1AA" },
            selectedPlan: {
              type: "string",
              enum: ["free", "premium"],
              default: "premium",
            },
            acceptTerms: { type: "boolean", example: true },
            acceptSubscriptionDisclosure: { type: "boolean", example: true },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["identifier", "password"],
          properties: {
            identifier: {
              type: "string",
              description: "Email address or username",
              example: "aisha@maaak.co.uk",
            },
            password: { type: "string", example: "Member#2026!" },
          },
        },
        DealbreakerItem: {
          type: "object",
          required: ["dealbreaker_code", "required_value"],
          properties: {
            dealbreaker_code: {
              type: "string",
              example: "religion",
              description:
                "One of the 25 supported dealbreaker codes from profile.xlsx (Compatibility-Dealbreakers).",
            },
            required_value: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
                { type: "object" },
              ],
              example: ["Muslim/Islam"],
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    paths: {
      "/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register a new user account",
          security: [],
          description:
            "Enforces unique email, unique mobile number, and 5–10 alphanumeric username. Provisions initial profile and 1st-Month Free Premium introductory trial.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            "201": { description: "Account created with access & refresh tokens" },
            "422": { description: "Validation or uniqueness error" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Authenticate with email/username and password",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Returns user profile and Bearer JWT tokens" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Authentication"],
          summary: "Revoke current session and clear cookies",
          responses: { "200": { description: "Logged out" } },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Authentication"],
          summary: "Rotate refresh token and issue new access token (Flutter & Web)",
          security: [],
          responses: { "200": { description: "Tokens rotated" } },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Authentication"],
          summary: "Request 6-digit password reset OTP",
          security: [],
          responses: { "200": { description: "OTP generated" } },
        },
      },
      "/auth/reset-password": {
        post: {
          tags: ["Authentication"],
          summary: "Reset password with 6-digit OTP code",
          security: [],
          responses: { "200": { description: "Password reset" } },
        },
      },
      "/auth/verify-email": {
        post: {
          tags: ["Authentication"],
          summary: "Verify email address using 6-digit OTP",
          responses: { "200": { description: "Email verified" } },
        },
      },
      "/auth/verify-mobile": {
        post: {
          tags: ["Authentication"],
          summary: "Verify mobile number using 6-digit OTP",
          responses: { "200": { description: "Mobile verified" } },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Authentication"],
          summary: "Get current authenticated user, profile, completion & entitlements",
          responses: { "200": { description: "Current user context" } },
        },
      },
      "/profiles/me": {
        get: {
          tags: ["Profiles"],
          summary: "Retrieve authenticated user's full profile, photos, preferences & dealbreakers",
          responses: { "200": { description: "Full profile bundle" } },
        },
        patch: {
          tags: ["Profiles"],
          summary: "Update profile fields and optionally publish profile",
          responses: { "200": { description: "Profile updated & matches recalculated" } },
        },
      },
      "/profiles": {
        post: {
          tags: ["Profiles"],
          summary: "Create or save multi-step profile wizard data",
          responses: { "201": { description: "Profile saved" } },
        },
      },
      "/profiles/{id}": {
        get: {
          tags: ["Profiles"],
          summary: "Get public-safe profile by user ID (surname, DOB, and full postcode hidden)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Public profile with watermark" } },
        },
      },
      "/profiles/photos": {
        post: {
          tags: ["Profiles"],
          summary: "Upload profile photograph or 30s voice bio (multipart/form-data or JSON)",
          responses: { "201": { description: "Photo or voice bio uploaded" } },
        },
      },
      "/profiles/photos/{id}": {
        delete: {
          tags: ["Profiles"],
          summary: "Delete a profile photograph (unpublishes profile if < 2 photos remain)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Photograph removed" } },
        },
      },
      "/profiles/completion": {
        get: {
          tags: ["Profiles"],
          summary: "Get profile completion percentage and missing required fields",
          responses: { "200": { description: "Completion metrics" } },
        },
      },
      "/profile-questions": {
        get: {
          tags: ["Profile Questions (Excel Workbook)"],
          summary: "Retrieve all 66 profile questions, categories, and dropdown catalogs from profile.xlsx",
          security: [],
          responses: { "200": { description: "Complete workbook question catalog" } },
        },
      },
      "/profile-questions/categories": {
        get: {
          tags: ["Profile Questions (Excel Workbook)"],
          summary: "List all 10 wizard steps / question categories mapped to profile.xlsx",
          security: [],
          responses: { "200": { description: "Categories list" } },
        },
      },
      "/profile-questions/{id}": {
        get: {
          tags: ["Profile Questions (Excel Workbook)"],
          summary: "Get single profile question and options by ID or question code",
          security: [],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Question details" } },
        },
      },
      "/profiles/me/answers": {
        get: {
          tags: ["Profile Questions (Excel Workbook)"],
          summary: "Get user's saved profile answers",
          responses: { "200": { description: "Saved answers" } },
        },
        put: {
          tags: ["Profile Questions (Excel Workbook)"],
          summary: "Save wizard step answers and trigger compatibility recalculation",
          responses: { "200": { description: "Answers saved" } },
        },
      },
      "/preferences": {
        get: {
          tags: ["Preferences & Dealbreakers"],
          summary: "Get WHAT I WANT partner preferences",
          responses: { "200": { description: "User preferences" } },
        },
        put: {
          tags: ["Preferences & Dealbreakers"],
          summary: "Update WHAT I WANT partner preferences and recalculate matches",
          responses: { "200": { description: "Preferences updated" } },
        },
      },
      "/dealbreakers": {
        get: {
          tags: ["Preferences & Dealbreakers"],
          summary: "Get WHAT I REQUIRE mandatory dealbreakers (max 5)",
          responses: { "200": { description: "User dealbreakers" } },
        },
        put: {
          tags: ["Preferences & Dealbreakers"],
          summary: "Save up to 5 non-negotiable dealbreakers and recalculate mutual eligibility",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    dealbreakers: {
                      type: "array",
                      maxItems: 5,
                      items: { $ref: "#/components/schemas/DealbreakerItem" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Dealbreakers saved" },
            "422": { description: "Exceeds 5 dealbreakers or duplicate code" },
          },
        },
      },
      "/matches": {
        get: {
          tags: ["Matching (Gale-Shapley)"],
          summary: "Get paginated mutually eligible matches",
          responses: { "200": { description: "Mutually eligible matches" } },
        },
      },
      "/matches/recommended": {
        get: {
          tags: ["Matching (Gale-Shapley)"],
          summary: "Get Gale-Shapley optimal match and top ranked recommendations",
          responses: { "200": { description: "Recommended matches" } },
        },
      },
      "/matches/{id}": {
        get: {
          tags: ["Matching (Gale-Shapley)"],
          summary: "Get specific match details if mutually eligible",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Match profile & compatibility" } },
        },
      },
      "/matches/recalculate": {
        post: {
          tags: ["Matching (Gale-Shapley)"],
          summary: "Trigger on-demand Gale-Shapley stable matching recalculation",
          responses: { "200": { description: "Matching run metrics" } },
        },
      },
      "/matches/{id}/compatibility": {
        get: {
          tags: ["Matching (Gale-Shapley)"],
          summary: "Get 6-area weighted compatibility breakdown with a candidate",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Compatibility breakdown" } },
        },
      },
      "/explore": {
        get: {
          tags: ["Discovery & Filtering"],
          summary: "Explore mutually eligible profiles with query filters",
          responses: { "200": { description: "Filtered profiles" } },
        },
      },
      "/explore/filter": {
        post: {
          tags: ["Discovery & Filtering"],
          summary: "Advanced profile filtering (strictly respects dealbreakers)",
          responses: { "200": { description: "Filtered profiles" } },
        },
      },
      "/profiles/{id}/like": {
        post: {
          tags: ["Discovery & Filtering"],
          summary: "Like, thumbs-up, or bookmark a profile",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Interaction saved" } },
        },
      },
      "/profiles/{id}/dislike": {
        post: {
          tags: ["Discovery & Filtering"],
          summary: "Dislike or thumbs-down a profile",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Pass recorded" } },
        },
      },
      "/requests": {
        post: {
          tags: ["Introduction Requests"],
          summary: "Send an introduction request (enforces 10-request limit for Free users)",
          responses: {
            "201": { description: "Introduction request sent" },
            "403": { description: "Free 10-request limit reached" },
          },
        },
      },
      "/requests/sent": {
        get: {
          tags: ["Introduction Requests"],
          summary: "List sent introduction requests and remaining allowance",
          responses: { "200": { description: "Sent requests" } },
        },
      },
      "/requests/received": {
        get: {
          tags: ["Introduction Requests"],
          summary: "List received introduction requests",
          responses: { "200": { description: "Received requests" } },
        },
      },
      "/requests/{id}/accept": {
        post: {
          tags: ["Introduction Requests"],
          summary: "Accept introduction request and create conversation (enforces Max 3 Active Chats)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Request accepted & chat opened" } },
        },
      },
      "/requests/{id}/reject": {
        post: {
          tags: ["Introduction Requests"],
          summary: "Reject an introduction request",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Request declined" } },
        },
      },
      "/requests/{id}": {
        delete: {
          tags: ["Introduction Requests"],
          summary: "Cancel a sent introduction request",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Request cancelled" } },
        },
      },
      "/conversations": {
        get: {
          tags: ["Messaging & Pusher"],
          summary: "List conversations and active chat count (max 3 active chats)",
          responses: { "200": { description: "Conversations list" } },
        },
        post: {
          tags: ["Messaging & Pusher"],
          summary: "Start or open a conversation (server-side Max 3 Active Chats enforced)",
          responses: {
            "201": { description: "Conversation started" },
            "403": { description: "3-active-chat limit reached or Free plan restriction" },
          },
        },
      },
      "/conversations/{id}/messages": {
        get: {
          tags: ["Messaging & Pusher"],
          summary: "Get message history for a conversation",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Messages list" } },
        },
        post: {
          tags: ["Messaging & Pusher"],
          summary: "Send a real-time message in an active conversation",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "201": { description: "Message delivered" } },
        },
      },
      "/conversations/{id}/read": {
        post: {
          tags: ["Messaging & Pusher"],
          summary: "Mark all messages in a conversation as read",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Read receipts updated" } },
        },
      },
      "/conversations/{id}/close": {
        post: {
          tags: ["Messaging & Pusher"],
          summary: "Close a conversation and free an active chat slot",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Conversation closed" } },
        },
      },
      "/calls": {
        get: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "Get call history",
          responses: { "200": { description: "Call records" } },
        },
        post: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "Initiate an Agora voice or video call and generate server-side RTC token",
          responses: { "201": { description: "Call initiated" } },
        },
      },
      "/calls/{id}/accept": {
        post: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "Accept an incoming Agora call",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Call accepted with RTC token" } },
        },
      },
      "/calls/{id}/reject": {
        post: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "Reject an incoming call",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Call rejected" } },
        },
      },
      "/calls/{id}/end": {
        post: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "End an active call or record missed call",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Call ended" } },
        },
      },
      "/calls/{id}/token": {
        post: {
          tags: ["Voice & Video Calling (Agora)"],
          summary: "Generate server-side Agora RTC token for authorised call participant",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Agora token" } },
        },
      },
      "/verification/start": {
        post: {
          tags: ["Identity Verification (Didit.me)"],
          summary: "Start a Didit.me identity verification session",
          responses: { "201": { description: "Verification session & redirect URL" } },
        },
      },
      "/verification/status": {
        get: {
          tags: ["Identity Verification (Didit.me)"],
          summary: "Get current identity verification status and session history",
          responses: { "200": { description: "Verification status" } },
        },
      },
      "/verification/retry": {
        post: {
          tags: ["Identity Verification (Didit.me)"],
          summary: "Retry Didit.me identity verification",
          responses: { "201": { description: "New verification session created" } },
        },
      },
      "/subscriptions/plans": {
        get: {
          tags: ["Subscriptions & Stripe"],
          summary: "Get CMS-managed subscription plans (Free, Premium w/ 1st Month Free, Premium Plus Coming Soon)",
          security: [],
          responses: { "200": { description: "Plans list" } },
        },
      },
      "/subscriptions/current": {
        get: {
          tags: ["Subscriptions & Stripe"],
          summary: "Get current user's subscription and feature entitlements",
          responses: { "200": { description: "Subscription & entitlements" } },
        },
      },
      "/subscriptions/checkout": {
        post: {
          tags: ["Subscriptions & Stripe"],
          summary: "Create Stripe Checkout session with 1st-Month Free introductory period",
          responses: { "200": { description: "Checkout URL & trial disclosure" } },
        },
      },
      "/subscriptions/cancel": {
        post: {
          tags: ["Subscriptions & Stripe"],
          summary: "Cancel subscription at period/trial end",
          responses: { "200": { description: "Cancellation scheduled" } },
        },
      },
      "/subscriptions/reactivate": {
        post: {
          tags: ["Subscriptions & Stripe"],
          summary: "Reactivate a cancelled subscription",
          responses: { "200": { description: "Subscription reactivated" } },
        },
      },
      "/subscriptions/invoices": {
        get: {
          tags: ["Subscriptions & Stripe"],
          summary: "Get payment & invoice history",
          responses: { "200": { description: "Invoices list" } },
        },
      },
      "/subscriptions/payment-methods": {
        get: {
          tags: ["Subscriptions & Stripe"],
          summary: "Get payment method management info via Stripe Customer Portal",
          responses: { "200": { description: "Portal info" } },
        },
      },
      "/subscriptions/portal": {
        post: {
          tags: ["Subscriptions & Stripe"],
          summary: "Create Stripe Customer Portal session for billing management",
          responses: { "200": { description: "Portal URL" } },
        },
      },
      "/webhooks/stripe": {
        post: {
          tags: ["Webhooks"],
          summary: "Idempotent Stripe webhook receiver (verifies stripe-signature)",
          security: [],
          responses: { "200": { description: "Webhook processed" } },
        },
      },
      "/webhooks/didit": {
        post: {
          tags: ["Webhooks"],
          summary: "Idempotent Didit.me webhook receiver (verifies canonical JSON HMAC-SHA256)",
          security: [],
          responses: { "200": { description: "Webhook processed" } },
        },
      },
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List user notifications and unread count",
          responses: { "200": { description: "Notifications list" } },
        },
      },
      "/notifications/{id}/read": {
        post: {
          tags: ["Notifications"],
          summary: "Mark a notification as read",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Marked read" } },
        },
      },
      "/notifications/read-all": {
        post: {
          tags: ["Notifications"],
          summary: "Mark all notifications as read",
          responses: { "200": { description: "All marked read" } },
        },
      },
      "/notifications/preferences": {
        put: {
          tags: ["Notifications"],
          summary: "Update push & email notification preferences",
          responses: { "200": { description: "Preferences updated" } },
        },
      },
      "/reports": {
        post: {
          tags: ["Safety, Reports & Blocking"],
          summary: "Report a profile, message, photo, or call",
          responses: { "201": { description: "Report created" } },
        },
      },
      "/blocks": {
        get: {
          tags: ["Safety, Reports & Blocking"],
          summary: "List blocked users",
          responses: { "200": { description: "Blocked users" } },
        },
        post: {
          tags: ["Safety, Reports & Blocking"],
          summary: "Block a user and immediately close any active conversation",
          responses: { "201": { description: "User blocked" } },
        },
      },
      "/blocks/{id}": {
        delete: {
          tags: ["Safety, Reports & Blocking"],
          summary: "Unblock a user",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "User unblocked" } },
        },
      },
      "/account/pause": {
        post: {
          tags: ["Account Management"],
          summary: "Pause or resume profile visibility",
          responses: { "200": { description: "Profile status updated" } },
        },
      },
      "/account/deactivate": {
        post: {
          tags: ["Account Management"],
          summary: "Deactivate account and revoke active sessions",
          responses: { "200": { description: "Account deactivated" } },
        },
      },
      "/account/delete": {
        post: {
          tags: ["Account Management"],
          summary: "Request permanent GDPR account deletion",
          responses: { "200": { description: "Deletion scheduled" } },
        },
      },
      "/account/settings": {
        patch: {
          tags: ["Account Management"],
          summary: "Update password, privacy settings, or record security deterrent events",
          responses: { "200": { description: "Settings updated" } },
        },
      },
      "/feedback": {
        post: {
          tags: ["Feedback"],
          summary: "Submit feedback bubble entry forwarded to info@maaak.co.uk",
          security: [],
          responses: { "201": { description: "Feedback saved" } },
        },
      },
      "/admin/dashboard": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Get comprehensive admin dashboard metrics & matching stats",
          responses: { "200": { description: "Admin metrics" } },
        },
      },
      "/admin/users": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Search and filter all registered users",
          responses: { "200": { description: "Users list" } },
        },
        patch: {
          tags: ["Admin CMS & Moderation"],
          summary: "Suspend, reactivate, pause, verify, or moderate a user profile",
          responses: { "200": { description: "User updated" } },
        },
      },
      "/admin/cms": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Retrieve all CMS pages and platform settings",
          responses: { "200": { description: "CMS pages & settings" } },
        },
        put: {
          tags: ["Admin CMS & Moderation"],
          summary: "Update CMS page content or platform settings (including location restrictions)",
          responses: { "200": { description: "CMS updated" } },
        },
      },
      "/admin/subscriptions": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Manage subscription plans, user subscriptions & revenue",
          responses: { "200": { description: "Subscription admin data" } },
        },
        put: {
          tags: ["Admin CMS & Moderation"],
          summary: "Update subscription plan pricing, features, or activate Premium Plus",
          responses: { "200": { description: "Plan updated" } },
        },
      },
      "/admin/matching": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Get compatibility weights, matching runs & Gale-Shapley logs",
          responses: { "200": { description: "Matching admin data" } },
        },
        post: {
          tags: ["Admin CMS & Moderation"],
          summary: "Update compatibility weights (must sum to 1.00; dealbreakers cannot be overridden) and trigger Gale-Shapley recalculation",
          responses: { "200": { description: "Matching run completed" } },
        },
      },
      "/admin/reports": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "List user reports for moderation",
          responses: { "200": { description: "Reports list" } },
        },
        patch: {
          tags: ["Admin CMS & Moderation"],
          summary: "Resolve or dismiss a report and optionally suspend reported account",
          responses: { "200": { description: "Report updated" } },
        },
      },
      "/admin/verifications": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Monitor Didit identity verification sessions",
          responses: { "200": { description: "Verification sessions" } },
        },
        patch: {
          tags: ["Admin CMS & Moderation"],
          summary: "Update verification review status",
          responses: { "200": { description: "Verification updated" } },
        },
      },
      "/admin/feedback": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "List feedback submissions sent to info@maaak.co.uk",
          responses: { "200": { description: "Feedback list" } },
        },
        patch: {
          tags: ["Admin CMS & Moderation"],
          summary: "Update feedback status and admin notes",
          responses: { "200": { description: "Feedback updated" } },
        },
      },
      "/admin/audit-logs": {
        get: {
          tags: ["Admin CMS & Moderation"],
          summary: "Retrieve immutable admin, user, security, billing & matching audit logs",
          responses: { "200": { description: "Audit logs" } },
        },
      },
    },
  };
}
