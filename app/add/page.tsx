import AddCards from '@/app/AddCards';

export default function AddCardPage() {
  return (
    <AddCards
      game="mtg"
      endpoint="/api/collection"
      backHref="/"
      backLabel="Back to collection"
      title="Add cards (MTG)"
    />
  );
}
