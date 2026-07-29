"use client";

import dynamic from "next/dynamic";

export const DynamicMapClient = dynamic(() => import("@/components/MapClient").then((module) => module.MapClient), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-[var(--border)] bg-white p-8">Zemljevid se nalaga ...</div>,
});
