import { content } from "@/lib/content";
import Game from "@/components/Game";

export const generateStaticParams = () => content.domains.map((d) => ({ domain: d.id }));
export const dynamicParams = false;

export default async function PlayPage({ params }) {
  const { domain } = await params;
  return <Game domainId={decodeURIComponent(domain)} />;
}
