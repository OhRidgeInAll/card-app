import GameLayoutShell from '@/app/GameLayoutShell';

export default function MtgLayout({ children }: { children: React.ReactNode }) {
  return <GameLayoutShell game="mtg">{children}</GameLayoutShell>;
}
