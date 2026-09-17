import AddCards from '@/app/AddCards';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function YugiohAddCardToDeckPage({ params }: Props) {
  const { id } = await params;
  return (
    <AddCards
      game="yugioh"
      endpoint={`/api/decks/${id}/cards`}
      backHref={`/yugioh/decks/${id}`}
      backLabel="Back to deck"
      title="Add cards to deck"
    />
  );
}
