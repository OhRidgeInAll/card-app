import AddCards from '@/app/AddCards';

export default function MtgAddPage() {
  return (
    <AddCards
      game="mtg"
      endpoint="/api/collection"
      backHref="/mtg/collection"
      backLabel="Back to collection"
      title="Add cards"
    />
  );
}
