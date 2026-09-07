import { NextResponse } from 'next/server';
import { getAllTags } from '@/lib/tags';

export async function GET() {
  return NextResponse.json({ tags: getAllTags() });
}
