import { vocab } from "@/lib/content";
import MatchGame from "@/components/MatchGame";

export const generateStaticParams = () => [...vocab.categories.map((c) => ({ cat: c.id })), { cat: "mix" }, { cat: "shapes" }];
export const dynamicParams = false;

export default async function Page({ params }) {
  const { cat } = await params;
  return <MatchGame cat={cat} />;
}
