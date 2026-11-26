import { content } from "@/lib/content";
import MonsterGame from "@/components/MonsterGame";

export const generateStaticParams = () => content.domains.map((d) => ({ domain: d.id }));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { domain } = await params;
  return <MonsterGame domainId={domain} />;
}
