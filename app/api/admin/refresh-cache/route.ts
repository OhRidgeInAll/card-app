import { NextResponse } from 'next/server';
import { refreshScryfallCache } from '@/lib/scryfall-cache';

export async function POST() {
  try {
    const result = await refreshScryfallCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Refresh failed' },
      { status: 502 }
    );
  }
}
