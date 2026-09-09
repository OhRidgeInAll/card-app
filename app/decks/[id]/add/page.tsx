import AddCards from '@/app/AddCards';

interface Props {
  params: { id: string };
}

export default function AddCardToDeckPage({ params }: Props) {
  return (
    <AddCards
      game="mtg"
      endpoint={`/api/decks/${params.id}/cards`}
      backHref={`/decks/${params.id}`}
      backLabel="Back to deck"
      title="Add cards to deck"
    />
  );
}
