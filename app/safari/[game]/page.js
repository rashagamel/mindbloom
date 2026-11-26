import { sounds } from "@/lib/content";
import SafariGame from "@/components/SafariGame";

export const generateStaticParams = () => sounds.games.map((g) => ({ game: g.id }));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { game } = await params;
  return <SafariGame game={game} />;
}
