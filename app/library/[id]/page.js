import { library } from "@/lib/content";
import Reader from "@/components/Reader";

export const generateStaticParams = () => library.items.map((i) => ({ id: i.id }));
export const dynamicParams = false;

export default async function ReaderPage({ params }) {
  const { id } = await params;
  return <Reader id={decodeURIComponent(id)} />;
}
