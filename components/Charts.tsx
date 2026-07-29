"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEur, formatNumber } from "@/lib/format";
import { distributionBy, monthlySeries, yearlySeries } from "@/lib/stats";
import type { Transaction } from "@/lib/schemas";

const colors = ["#2f6f56", "#2c627e", "#a86c16", "#6d6a73", "#8b3f45", "#50723c"];

export function YearCharts({ transactions }: { transactions: Transaction[] }) {
  const yearly = yearlySeries(transactions);
  const monthly = monthlySeries(transactions);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Število poslov po letu</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [formatNumber(Number(value)), "poslov"]} labelFormatter={(label) => `Leto ${label}`} />
              <Bar dataKey="count" name="Posli" fill="#2f6f56" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mediana pogodbene cene po letu</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip
                formatter={(value, name) => [formatEur(Number(value)), name === "medianPrice" ? "mediana" : "EUR/m2"]}
                labelFormatter={(label) => {
                  const point = yearly.find((item) => item.year === Number(label));
                  return `Leto ${label}, n = ${point?.count ?? 0}`;
                }}
              />
              <Line type="monotone" dataKey="medianPrice" name="Mediana" stroke="#2c627e" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Aktivnost po mesecih</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [formatNumber(Number(value)), "poslov"]} />
              <Bar dataKey="count" name="Posli" fill="#a86c16" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function DistributionCharts({ transactions }: { transactions: Transaction[] }) {
  const category = distributionBy(transactions, (transaction) => [transaction.mainCategory]).slice(0, 8);
  const settlement = distributionBy(transactions, (transaction) => transaction.settlements).slice(0, 8);
  const quality = distributionBy(transactions, (transaction) => [transaction.quality]);
  const marketability = distributionBy(transactions, (transaction) => [transaction.marketability ?? "Ni podatka"]).slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DistributionCard title="Kategorije" data={category} />
      <DistributionCard title="Naselja" data={settlement} />
      <DistributionCard title="Interna kakovost A/B/C" data={quality} />
      <DistributionCard title="Uradna tržnost GURS" data={marketability} />
    </div>
  );
}

function DistributionCard({ title, data }: { title: string; data: Array<{ key: string; count: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="text-sm font-normal text-[var(--muted)]">n = {formatNumber(data.reduce((sum, item) => sum + item.count, 0))}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="key" width={140} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [formatNumber(Number(value)), "poslov"]} />
            <Bar dataKey="count" name="Posli">
              {data.map((entry, index) => (
                <Cell key={entry.key} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
