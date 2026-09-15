import AddCards from '@/app/AddCards';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MtgAddCardToDeckPage({ params }: Props) {
  const { id } = await params;
  return (
    <AddCards
      game="mtg"
      endpoint={`/api/decks/${id}/cards`}
      backHref={`/mtg/decks/${id}`}
      backLabel="Back to deck"
      title="Add cards to deck"
    />
  );
}
