import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getMergedHeroes, HERO_CACHE_TAG } from "@/src/lib/api";

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "").trim();

  if (!configuredSecret || bearerToken !== configuredSecret) {
    return unauthorized();
  }

  revalidateTag(HERO_CACHE_TAG, "max");
  const heroes = await getMergedHeroes();

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    heroCount: heroes.length,
  });
}
