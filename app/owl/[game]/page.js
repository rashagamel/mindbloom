import { owl } from "@/lib/content";
import OwlGame from "@/components/OwlGame";

export const generateStaticParams = () => owl.games.map((g) => ({ game: g.id }));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { game } = await params;
  return <OwlGame game={game} />;
}
