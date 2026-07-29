"use client";

/* eslint-disable react-hooks/incompatible-library */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownUp, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { transactionsToCsv } from "@/lib/csv";
import { withFilterSearch, type Filters } from "@/lib/filters";
import { compactList, formatDate, formatDecimal, formatEur, formatNumber } from "@/lib/format";
import type { Transaction } from "@/lib/schemas";

export function TransactionsTable({ rows, filters }: { rows: Transaction[]; filters: Filters }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "contractDate", desc: true }]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const columns = useMemo<Array<ColumnDef<Transaction>>>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Link className="font-medium text-[var(--accent)] underline-offset-4 hover:underline" href={withFilterSearch(`/posli/${row.original.id}`, filters)}>
            {row.original.id}
          </Link>
        ),
      },
      {
        id: "contractDate",
        accessorKey: "contractDate",
        header: "Datum",
        cell: ({ row }) => formatDate(row.original.contractDate),
      },
      {
        id: "priceEur",
        accessorKey: "priceEur",
        header: "Cena",
        cell: ({ row }) => formatEur(row.original.priceEur),
      },
      {
        id: "mainCategory",
        accessorKey: "mainCategory",
        header: "Kategorija",
      },
      {
        id: "settlements",
        accessorKey: "settlements",
        header: "Naselje",
        cell: ({ row }) => compactList(row.original.settlements),
      },
      {
        id: "quality",
        accessorKey: "quality",
        header: "Kakovost",
      },
      {
        id: "marketability",
        accessorKey: "marketability",
        header: "Tržnost",
        cell: ({ row }) => row.original.marketability ?? "ni podatka",
      },
      {
        id: "analyticalPriceEurM2",
        accessorKey: "analyticalPriceEurM2",
        header: "EUR/m2",
        cell: ({ row }) => formatDecimal(row.original.analyticalPriceEurM2, " EUR/m2"),
      },
      {
        id: "soldLandAreaM2",
        accessorKey: "soldLandAreaM2",
        header: "Zemljišče",
        cell: ({ row }) => formatDecimal(row.original.soldLandAreaM2, " m2"),
      },
      {
        id: "detail",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Link className="inline-flex rounded-md p-2 hover:bg-[#eef3ee]" aria-label={`Odpri posel ${row.original.id}`} href={withFilterSearch(`/posli/${row.original.id}`, filters)}>
            <Eye aria-hidden="true" className="h-4 w-4" />
          </Link>
        ),
      },
    ],
    [filters],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.id === "detail" || !hidden[String(column.id)]),
    [columns, hidden],
  );

  const table = useReactTable({
    data: rows,
    columns: visibleColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  function exportCsv() {
    const csv = transactionsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "etn-brezovica-filtrirani-posli.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle>Filtrirani posli n = {formatNumber(rows.length)}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download aria-hidden="true" className="h-4 w-4" />
            CSV
          </Button>
          {columns
            .filter((column) => column.id !== "detail")
            .map((column) => {
              const id = String(column.id);
              return (
                <Button key={id} variant="ghost" size="sm" onClick={() => setHidden((value) => ({ ...value, [id]: !value[id] }))}>
                  {hidden[id] ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  {typeof column.header === "string" ? column.header : id}
                </Button>
              );
            })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[var(--border)]">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 text-left font-semibold">
                      {header.isPlaceholder ? null : (
                        <button className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? <ArrowDownUp aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[#f1f5f0]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Stran {table.getState().pagination.pageIndex + 1} od {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Nazaj
            </Button>
            <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Naprej
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
