import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid collection item id' }, { status: 400 });
  }

  const body = await request.json();

  if (body && typeof body === 'object' && 'printing' in body) {
    const printing = body.printing;
    if (!printing || typeof printing.external_id !== 'string' || typeof printing.set_code !== 'string') {
      return NextResponse.json({ error: 'printing.external_id and printing.set_code are required' }, { status: 400 });
    }

    const result = db
      .prepare(
        `UPDATE collection_items
         SET printing_external_id = @external_id,
             printing_set_code = @set_code,
             printing_image_url = @image_url,
             printing_attributes = @attributes
         WHERE id = @id`
      )
      .run({
        id,
        external_id: printing.external_id,
        set_code: printing.set_code,
        image_url: printing.image_url ?? null,
        attributes: printing.attributes ? JSON.stringify(printing.attributes) : null,
      });

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Collection item not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, printing });
  }

  const delta = Number(body?.delta);

  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be a non-zero number' }, { status: 400 });
  }

  const getItem = db.prepare(`SELECT id, quantity_owned FROM collection_items WHERE id = ?`);
  const updateQuantity = db.prepare(`UPDATE collection_items SET quantity_owned = ? WHERE id = ?`);
  const deleteItem = db.prepare(`DELETE FROM collection_items WHERE id = ?`);

  const applyDelta = db.transaction(() => {
    const item = getItem.get(id) as { id: number; quantity_owned: number } | undefined;

    if (!item) {
      return { status: 'not_found' as const };
    }

    const newQuantity = item.quantity_owned + delta;

    // Hitting zero (or going negative) removes the row rather than storing a
    // 0-quantity line - an item you don't own any copies of isn't "in" your
    // collection.
    if (newQuantity <= 0) {
      deleteItem.run(id);
      return { status: 'deleted' as const };
    }

    updateQuantity.run(newQuantity, id);
    return { status: 'updated' as const, quantity: newQuantity };
  });

  const result = applyDelta();

  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'Collection item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid collection item id' }, { status: 400 });
  }

  const result = db.prepare(`DELETE FROM collection_items WHERE id = ?`).run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Collection item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
