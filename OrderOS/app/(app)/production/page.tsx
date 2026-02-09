"use client";

import { useEffect, useMemo, useState } from "react";

type ProductionResponse = {
  date: string;
  totals: Array<{ name: string; qty: number }>;
  byOrder: Array<{
    orderId: string;
    customerName: string;
    items: Array<{ name: string; qty: number }>;
  }>;
};

function todayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductionPage() {
  const [date, setDate] = useState(todayDateISO());
  const [data, setData] = useState<ProductionResponse | null>(null);

  const endpoint = useMemo(() => `/api/production?date=${date}`, [date]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        setData(payload);
      });

    return () => controller.abort();
  }, [endpoint]);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Lista de Produção</h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-sm text-zinc-600" htmlFor="production-date">
          Data de produção
        </label>
        <input
          id="production-date"
          type="date"
          value={date}
          onChange={(event) => {
            setData(null);
            setDate(event.target.value);
          }}
          className="mt-1 block rounded-md border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Totais por item</h3>
        {!data ? <p className="text-sm text-zinc-500">Carregando...</p> : null}
        {data && data.totals.length === 0 ? <p className="text-sm text-zinc-500">Sem itens para o dia.</p> : null}
        <div className="space-y-2">
          {data?.totals.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2">
              <span>{item.name}</span>
              <span className="font-semibold">{item.qty}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Conferência por pedido</h3>
        <div className="space-y-3">
          {data?.byOrder.map((order) => (
            <div key={order.orderId} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">
                {order.customerName} <span className="text-zinc-500">({order.orderId})</span>
              </p>
              <p className="text-sm text-zinc-600">{order.items.map((item) => `${item.qty}x ${item.name}`).join(", ")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
