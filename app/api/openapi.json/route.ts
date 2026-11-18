import { NextResponse } from "next/server";
import { getOpenApiSpecification } from "@/lib/openapi-spec";

export async function GET() {
  return NextResponse.json(getOpenApiSpecification(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
