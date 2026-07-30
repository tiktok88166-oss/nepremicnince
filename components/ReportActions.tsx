"use client";

import { GitCompareArrows, Heart, Printer, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { comparisonEvent, comparisonStorageKey, readComparisonItems, type PropertyComparisonItem } from "@/lib/property-comparison";

export function ReportActions({ reportId, title, comparison }: { reportId: string; title: string; comparison: PropertyComparisonItem }) {
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setSaved(readSavedReports().includes(reportId));
      setCompared(readComparisonItems(localStorage).some((item) => item.id === comparison.id));
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [comparison.id, reportId]);

  function toggleSaved() {
    const storageKey = "nepremicnince:saved-reports";
    const current = readSavedReports();
    const alreadySaved = current.includes(reportId);
    const next = alreadySaved ? current.filter((item) => item !== reportId) : [...current, reportId];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(!alreadySaved);
    setMessage(alreadySaved ? "Odstranjeno iz shranjenih" : "Poročilo je shranjeno v tem brskalniku");
  }

  function toggleComparison() {
    const current = readComparisonItems(localStorage);
    const alreadyCompared = current.some((item) => item.id === comparison.id);
    if (!alreadyCompared && current.length >= 4) {
      setMessage("Primerjate lahko največ štiri nepremičnine");
      return;
    }
    const next = alreadyCompared ? current.filter((item) => item.id !== comparison.id) : [...current, comparison];
    localStorage.setItem(comparisonStorageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(comparisonEvent));
    setCompared(!alreadyCompared);
    setMessage(alreadyCompared ? "Odstranjeno iz primerjave" : "Dodano v primerjavo");
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
      <button type="button" onClick={toggleComparison} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]" aria-pressed={compared}>
        <GitCompareArrows aria-hidden="true" className="h-4 w-4" /> {compared ? "V primerjavi" : "Dodaj v primerjavo"}
      </button>
      <button type="button" onClick={() => void share()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]"><Share2 aria-hidden="true" className="h-4 w-4" /> Deli</button>
      <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold hover:border-[var(--accent)]"><Printer aria-hidden="true" className="h-4 w-4" /> Natisni</button>
      <span className="min-h-5 text-xs text-[var(--muted)]" aria-live="polite">{message}</span>
    </div>
  );
}

function readSavedReports() {
  try {
    const value = JSON.parse(localStorage.getItem("nepremicnince:saved-reports") ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
