import type { Game } from '@/types/card';
import Sidebar from './Sidebar';

interface Props {
  game: Game;
  children: React.ReactNode;
}

export default function GameLayoutShell({ game, children }: Props) {
  return (
    <div data-game={game}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 col-md-3 col-lg-2 px-0">
            <Sidebar currentGame={game} />
          </div>
          <div className="col-12 col-md-9 col-lg-10 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
