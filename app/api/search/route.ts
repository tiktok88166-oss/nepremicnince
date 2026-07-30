import { NextRequest, NextResponse } from "next/server";
import { normalizeSearchMunicipality, searchProperties } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const municipality = normalizeSearchMunicipality(request.nextUrl.searchParams.get("municipality"));
  try {
    const results = await searchProperties(query, municipality);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Property search failed", error);
    return NextResponse.json({ error: "Iskanje trenutno ni dosegljivo.", results: [] }, { status: 503 });
  }
}
