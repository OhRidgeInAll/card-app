'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Game } from '@/types/card';

const GAMES: { key: Game; label: string }[] = [
  { key: 'mtg', label: 'Magic: The Gathering' },
  { key: 'yugioh', label: 'Yu-Gi-Oh!' },
  { key: 'hololive', label: 'Hololive' },
];

const VIEWS: { segment: string; label: string }[] = [
  { segment: 'collection', label: 'Collection View' },
  { segment: 'import', label: 'Bulk Entry' },
  { segment: 'add', label: 'Entry' },
  { segment: 'decks', label: 'Decks' },
];

interface Props {
  currentGame: Game;
}

export default function Sidebar({ currentGame }: Props) {
  const pathname = usePathname();

  return (
    <nav className="d-flex flex-column gap-4 p-3 border-end h-100">
      <div>
        <h6 className="text-uppercase text-secondary small fw-bold mb-2">Game</h6>
        <div className="list-group">
          {GAMES.map((g) => (
            <Link
              key={g.key}
              href={`/${g.key}/collection`}
              className={`list-group-item list-group-item-action ${g.key === currentGame ? 'active' : ''}`}
            >
              {g.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h6 className="text-uppercase text-secondary small fw-bold mb-2">View</h6>
        <div className="list-group">
          {VIEWS.map((v) => {
            const href = `/${currentGame}/${v.segment}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={v.segment}
                href={href}
                className={`list-group-item list-group-item-action ${active ? 'active' : ''}`}
              >
                {v.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
