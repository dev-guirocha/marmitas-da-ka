"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const ORDER_STATUS = ["RECEBIDO", "PREPARANDO", "PRONTO", "SAIU_PARA_ENTREGA", "ENTREGUE", "CANCELADO"];
const PAYMENT_STATUS = ["PENDENTE", "PAGO", "PARCIAL", "ESTORNADO"];

type OrderItem = {
  id: string;
  qty: number;
  freeName?: string | null;
  unitPriceCents?: number | null;
  subtotalCents?: number | null;
  menuItem?: { name: string } | null;
};

type OrderDetail = {
  id: string;
  source: string;
  statusPedido: string;
  statusPagamento: string;
  paymentMethod: string;
  totalCents: number;
  paidCents: number;
  addressSnapshot: string;
  windowSnapshot?: string | null;
  deliveryDate: string;
  notes?: string | null;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  items: OrderItem[];
};

function centsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [windowSnapshot, setWindowSnapshot] = useState("");

  async function load() {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json();
      setOrder(res.ok ? data : null);
      if (res.ok) {
        setNotes(data.notes || "");
        setAddress(data.addressSnapshot || "");
        setWindowSnapshot(data.windowSnapshot || "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const itemRows = useMemo(() => {
    if (!order) return [];
    return order.items.map((item) => ({
      ...item,
      name: item.freeName || item.menuItem?.name || "Item",
    }));
  }, [order]);

  async function setStatus(statusPedido: string) {
    if (!order) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "SET_STATUS", statusPedido }),
    });
    setMessage("Status atualizado");
    void load();
  }

  async function setPayment(statusPagamento: string) {
    if (!order) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "SET_PAYMENT",
        statusPagamento,
        paidCents: statusPagamento === "PAGO" ? order.totalCents : order.paidCents,
      }),
    });
    setMessage("Pagamento atualizado");
    void load();
  }

  async function saveEditable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        addressSnapshot: address,
        windowSnapshot,
      }),
    });

    setMessage("Pedido atualizado");
    void load();
  }

  if (loading) {
    return <p>Carregando pedido...</p>;
  }

  if (!order) {
    return <p>Pedido não encontrado.</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Pedido #{order.id}</h2>

      <div className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p>
            <strong>Cliente:</strong> {order.customer.name}
          </p>
          <p>
            <strong>Telefone:</strong> {order.customer.phone}
          </p>
          <p>
            <strong>Origem:</strong> {order.source}
          </p>
          <p>
            <strong>Total:</strong> {centsToBRL(order.totalCents)}
          </p>
          <p>
            <strong>Pago:</strong> {centsToBRL(order.paidCents)}
          </p>
        </div>

        <div className="grid gap-3">
          <select
            value={order.statusPedido}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {ORDER_STATUS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={order.statusPagamento}
            onChange={(e) => setPayment(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {PAYMENT_STATUS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={saveEditable} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Endereço"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          value={windowSnapshot}
          onChange={(e) => setWindowSnapshot(e.target.value)}
          placeholder="Janela de entrega"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações"
          className="min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
          Salvar alterações
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Itens</h3>
        <div className="space-y-2 text-sm">
          {itemRows.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2">
              <span>
                {item.qty}x {item.name}
              </span>
              <span>{typeof item.subtotalCents === "number" ? centsToBRL(item.subtotalCents) : "-"}</span>
            </div>
          ))}
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </section>
  );
}
