import { content } from "@/lib/content";
import TwinsRunner from "@/components/TwinsRunner";

export const generateStaticParams = () =>
  content.domains.flatMap((d) => (d.groups ?? []).map((_, i) => ({ domain: d.id, group: String(i) })));
export const dynamicParams = false;

export default async function Page({ params }) {
  const { domain, group } = await params;
  return <TwinsRunner domainId={domain} groupIndex={Number(group)} />;
}
