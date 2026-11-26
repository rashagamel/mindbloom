import { levels } from "@/lib/content";
import WorldMap from "@/components/WorldMap";

export const generateStaticParams = () => levels.worlds.map((w) => ({ domain: w.domain }));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { domain } = await params;
  return <WorldMap domainId={domain} />;
}
