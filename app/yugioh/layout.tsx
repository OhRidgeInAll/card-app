import GameLayoutShell from '@/app/GameLayoutShell';

export default function YugiohLayout({ children }: { children: React.ReactNode }) {
  return <GameLayoutShell game="yugioh">{children}</GameLayoutShell>;
}
