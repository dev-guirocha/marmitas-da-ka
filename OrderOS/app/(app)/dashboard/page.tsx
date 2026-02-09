"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ORDER_STATUS = ["RECEBIDO", "PREPARANDO", "PRONTO", "SAIU_PARA_ENTREGA", "ENTREGUE", "CANCELADO"];
const PAYMENT_STATUS = ["PENDENTE", "PAGO", "PARCIAL", "ESTORNADO"];

type DashboardOrder = {
  id: string;
  deliveryOrder: number;
  customer: { name: string; phone: string };
  addressSnapshot: string;
  windowSnapshot?: string | null;
  totalCents: number;
  paidCents: number;
  statusPedido: string;
  statusPagamento: string;
  createdAt: string;
  itemsSummary: string[];
};

function centsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function todayDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [date, setDate] = useState(todayDateISO());
  const [statusPedido, setStatusPedido] = useState("");
  const [statusPagamento, setStatusPagamento] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ date });
    if (statusPedido) params.set("statusPedido", statusPedido);
    if (statusPagamento) params.set("statusPagamento", statusPagamento);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [date, statusPedido, statusPagamento, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?${query}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatusPedido(orderId: string, nextStatus: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "SET_STATUS", statusPedido: nextStatus }),
    });

    void load();
  }

  async function togglePago(order: DashboardOrder) {
    const next = order.statusPagamento === "PAGO" ? "PENDENTE" : "PAGO";
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "SET_PAYMENT",
        statusPagamento: next,
        paidCents: next === "PAGO" ? order.totalCents : 0,
      }),
    });

    void load();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />

        <select
          value={statusPedido}
          onChange={(e) => setStatusPedido(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Status do pedido</option>
          {ORDER_STATUS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={statusPagamento}
          onChange={(e) => setStatusPagamento(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Status do pagamento</option>
          {PAYMENT_STATUS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome/telefone/endereço"
          className="rounded-md border border-zinc-300 px-3 py-2 md:col-span-2"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 text-left">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Entrega</th>
              <th className="px-3 py-2">Itens</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Pedido</th>
              <th className="px-3 py-2">Pagamento</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{order.customer.name}</div>
                  <div className="text-zinc-500">{order.customer.phone}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{order.addressSnapshot}</div>
                  <div className="text-zinc-500">{order.windowSnapshot || "-"}</div>
                </td>
                <td className="px-3 py-2">{order.itemsSummary.join(", ") || "-"}</td>
                <td className="px-3 py-2">
                  <div>{centsToBRL(order.totalCents)}</div>
                  <div className="text-zinc-500">Pago: {centsToBRL(order.paidCents)}</div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={order.statusPedido}
                    onChange={(e) => updateStatusPedido(order.id, e.target.value)}
                    className="rounded-md border border-zinc-300 px-2 py-1"
                  >
                    {ORDER_STATUS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{order.statusPagamento}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePago(order)}
                      className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100"
                    >
                      {order.statusPagamento === "PAGO" ? "Marcar pendente" : "Marcar pago"}
                    </button>
                    <Link href={`/orders/${order.id}`} className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                      Abrir
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Carregando...</p> : null}
    </section>
  );
}
