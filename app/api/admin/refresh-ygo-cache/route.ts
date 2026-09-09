import { NextResponse } from 'next/server';
import { refreshYgoCache } from '@/lib/ygoprodeck-cache';

export async function POST() {
  try {
    const result = await refreshYgoCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Refresh failed' },
      { status: 502 }
    );
  }
}
