import AddCards from '@/app/AddCards';

export default function YugiohAddPage() {
  return (
    <AddCards
      game="yugioh"
      endpoint="/api/collection"
      backHref="/yugioh/collection"
      backLabel="Back to collection"
      title="Add cards"
    />
  );
}
