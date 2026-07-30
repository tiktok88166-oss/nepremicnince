import { PageShell } from "@/components/PageShell";
import { MarketMapClient } from "@/components/MarketMapClient";

export default function MapPage() {
  return <PageShell title="Zemljevid poslov" subtitle="Gručen prikaz potrjenih prodajnih in najemnih poslov za Ljubljano in Brezovico."><MarketMapClient /></PageShell>;
}
