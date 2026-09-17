import GameLayoutShell from '@/app/GameLayoutShell';

export default function HololiveLayout({ children }: { children: React.ReactNode }) {
  return <GameLayoutShell game="hololive">{children}</GameLayoutShell>;
}
