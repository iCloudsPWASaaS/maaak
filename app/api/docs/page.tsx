import Link from "next/link";
import { getOpenApiSpecification } from "@/lib/openapi-spec";

export const metadata = {
  title: "API Documentation (OpenAPI 3.0) | Ma'aak Matrimony Platform",
  description:
    "Complete REST API documentation for Ma'aak Next.js Web and Flutter Mobile applications.",
};

export default function ApiDocsPage() {
  const spec = getOpenApiSpecification();
  const paths = Object.entries(spec.paths);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1A1612]">
      <header className="border-b border-[#E5DEC9] bg-[#14110E] text-[#F5EFE6]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ma'aak" className="h-9 w-auto" />
            </Link>
            <span className="rounded-full border border-[#C59B5F]/40 bg-[#C59B5F]/15 px-3 py-1 text-xs font-medium text-[#D8B57D]">
              OpenAPI {spec.openapi} • v{spec.info.version}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#C59B5F] px-4 py-2 text-xs font-semibold text-[#D8B57D] transition hover:bg-[#C59B5F] hover:text-[#14110E]"
            >
              Download /api/openapi.json
            </a>
            <a
              href="/postman/MAAAK_API_v1.postman_collection.json"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#C59B5F] px-4 py-2 text-xs font-semibold text-[#14110E] transition hover:bg-[#D4AF37]"
            >
              Postman Collection
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-2xl border border-[#E5DEC9] bg-white p-8 shadow-sm">
          <h1 className="font-serif text-3xl font-semibold text-[#1A1612]">
            {spec.info.title}
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#5C5346]">
            {spec.info.description}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-[#FAF6F0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8C6D3F]">
                Base Versioned URL
              </div>
              <code className="mt-1 block text-sm font-semibold text-[#1A1612]">
                /api/v1
              </code>
            </div>
            <div className="rounded-xl bg-[#FAF6F0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8C6D3F]">
                Flutter & Mobile Auth
              </div>
              <code className="mt-1 block text-sm font-semibold text-[#1A1612]">
                Authorization: Bearer &lt;JWT&gt;
              </code>
            </div>
            <div className="rounded-xl bg-[#FAF6F0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8C6D3F]">
                Database Schema
              </div>
              <code className="mt-1 block text-sm font-semibold text-[#1A1612]">
                Supabase PostgreSQL: matrimony
              </code>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {paths.map(([pathUrl, methodsObj]) =>
            Object.entries(methodsObj as Record<string, Record<string, unknown>>).map(
              ([method, details]) => {
                const upper = method.toUpperCase();
                const badgeColor =
                  upper === "GET"
                    ? "bg-emerald-900/10 text-emerald-800 border-emerald-700/30"
                    : upper === "POST"
                      ? "bg-amber-900/10 text-amber-900 border-amber-700/30"
                      : upper === "PUT" || upper === "PATCH"
                        ? "bg-blue-900/10 text-blue-900 border-blue-700/30"
                        : "bg-rose-900/10 text-rose-900 border-rose-700/30";

                const tags = (details.tags as string[]) || ["API"];
                return (
                  <div
                    key={`${method}-${pathUrl}`}
                    className="rounded-xl border border-[#E5DEC9] bg-white p-5 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badgeColor}`}
                        >
                          {upper}
                        </span>
                        <code className="text-sm font-semibold text-[#1A1612]">
                          /api/v1{pathUrl}
                        </code>
                      </div>
                      <span className="rounded-full bg-[#FAF6F0] px-3 py-1 text-xs font-medium text-[#7A6A53]">
                        {tags[0]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#4A4238]">
                      {String(details.summary || "")}
                    </p>
                    {Boolean(details.description) && (
                      <p className="mt-1 text-xs text-[#7A6A53]">
                        {String(details.description)}
                      </p>
                    )}
                  </div>
                );
              },
            ),
          )}
        </div>
      </main>
    </div>
  );
}
