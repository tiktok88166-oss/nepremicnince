"use client";

import { Heart, Printer, Share2 } from "lucide-react";
import { useState } from "react";

export function ReportActions({ reportId, title }: { reportId: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  function toggleSaved() {
    const storageKey = "nepremicnince:saved-reports";
    const current = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
    const alreadySaved = current.includes(reportId);
    const next = alreadySaved ? current.filter((item) => item !== reportId) : [...current, reportId];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(!alreadySaved);
    setMessage(alreadySaved ? "Odstranjeno iz shranjenih" : "Poročilo je shranjeno v tem brskalniku");
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        setMessage("Poročilo je deljeno");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Povezava je kopirana");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("Deljenje ni uspelo");
    }
  }

  return (
    <div className="report-actions flex flex-wrap items-center gap-2">
      <button type="button" onClick={toggleSaved} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]" aria-pressed={saved}>
        <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? "fill-[#b83e45] text-[#b83e45]" : ""}`} /> {saved ? "Shranjeno" : "Shrani"}
      </button>
      <button type="button" onClick={() => void share()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]"><Share2 aria-hidden="true" className="h-4 w-4" /> Deli</button>
      <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]"><Printer aria-hidden="true" className="h-4 w-4" /> Natisni</button>
      <span className="min-h-5 text-xs text-[var(--muted)]" aria-live="polite">{message}</span>
    </div>
  );
}
