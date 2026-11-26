import { levels } from "@/lib/content";
import LevelRunner from "@/components/LevelRunner";

export const generateStaticParams = () => levels.worlds.flatMap((w) => w.levels.map((l) => ({ domain: w.domain, level: l.id })));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { domain, level } = await params;
  return <LevelRunner domainId={domain} levelId={level} />;
}
