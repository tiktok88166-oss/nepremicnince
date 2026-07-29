"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersFromSearchParams, filtersToSearchParams, type Filters } from "@/lib/filters";

export function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  function setFilters(nextFilters: Filters) {
    const params = filtersToSearchParams(nextFilters).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function patchFilters(patch: Partial<Filters>) {
    setFilters({ ...filters, ...patch });
  }

  return { filters, patchFilters, setFilters };
}
