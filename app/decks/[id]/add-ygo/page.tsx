import AddCards from '@/app/AddCards';

interface Props {
  params: { id: string };
}

export default function AddYgoCardToDeckPage({ params }: Props) {
  return (
    <AddCards
      game="yugioh"
      endpoint={`/api/decks/${params.id}/cards`}
      backHref={`/decks/${params.id}`}
      backLabel="Back to deck"
      title="Add cards to deck (Yu-Gi-Oh!)"
    />
  );
}
