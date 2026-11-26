import { content } from "@/lib/content";
import MemoryGame from "@/components/MemoryGame";

export const generateStaticParams = () => content.domains.filter((d) => d.memory).map((d) => ({ domain: d.id }));
export const dynamicParams = false;

export default async function MemoryPage({ params }) {
  const { domain } = await params;
  return <MemoryGame domainId={decodeURIComponent(domain)} />;
}
