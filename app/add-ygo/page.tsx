import AddCards from '@/app/AddCards';

export default function AddYgoCardPage() {
  return (
    <AddCards
      game="yugioh"
      endpoint="/api/collection"
      backHref="/"
      backLabel="Back to collection"
      title="Add cards (Yu-Gi-Oh!)"
    />
  );
}
