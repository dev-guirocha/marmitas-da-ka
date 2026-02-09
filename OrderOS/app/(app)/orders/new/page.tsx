"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

type ActiveMenu = {
  id: string;
  name: string;
  monthRef: string;
  items: MenuItem[];
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  addressText?: string | null;
};

function todayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

function centsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function NewOrderPage() {
  const router = useRouter();

  const [menu, setMenu] = useState<ActiveMenu | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayDateISO());
  const [windowLabel, setWindowLabel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [notes, setNotes] = useState("");

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      setLoadingMenu(true);
      try {
        const res = await fetch("/api/menus/active", { cache: "no-store" });
        if (!res.ok) {
          setMenu(null);
          return;
        }
        const data = (await res.json()) as ActiveMenu;
        setMenu(data);
      } finally {
        setLoadingMenu(false);
      }
    }

    void loadMenu();
  }, []);

  async function lookupCustomerByPhone() {
    if (!phone.trim()) return;
    const res = await fetch(`/api/customers?search=${encodeURIComponent(phone.trim())}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as Customer[];
    if (data.length === 0) return;

    const best = data[0];
    setName((prev) => prev || best.name || "");
    setEmail((prev) => prev || best.email || "");
    setAddress((prev) => prev || best.addressText || "");
  }

  const selectedItems = useMemo(() => {
    if (!menu) return [];
    return menu.items
      .map((item) => ({ item, qty: selected[item.id] ?? 0 }))
      .filter(({ qty }) => qty > 0)
      .map(({ item, qty }) => ({
        menuItemId: item.id,
        freeName: item.name,
        qty,
        unitPriceCents: item.priceCents,
      }));
  }, [menu, selected]);

  const totalCents = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0),
    [selectedItems],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            phone,
            name,
            email: email || undefined,
            addressText: address || undefined,
          },
          delivery: {
            date: deliveryDate,
            address,
            windowLabel: windowLabel || undefined,
          },
          payment: {
            method: paymentMethod,
            totalCents,
            paidCents: 0,
            statusPagamento: "PENDENTE",
          },
          items: selectedItems,
          notes: notes || undefined,
          source: "MANUAL",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erro ao criar pedido");
        return;
      }

      router.push(`/orders/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Novo Pedido</h2>

      {loadingMenu ? <p>Carregando cardápio...</p> : null}
      {!loadingMenu && !menu ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Nenhum cardápio ativo encontrado. Ative um em Cardápio.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={lookupCustomerByPhone}
            placeholder="Telefone"
            className="rounded-md border border-zinc-300 px-3 py-2"
            required
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="rounded-md border border-zinc-300 px-3 py-2"
            required
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (opcional)"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço"
            className="rounded-md border border-zinc-300 px-3 py-2 md:col-span-2"
            required
          />
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
            required
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={windowLabel}
            onChange={(e) => setWindowLabel(e.target.value)}
            placeholder="Janela de entrega (ex.: 13h às 18h)"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="PIX">PIX</option>
            <option value="DINHEIRO">DINHEIRO</option>
            <option value="CARTAO">CARTAO</option>
            <option value="OUTRO">OUTRO</option>
          </select>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações"
          className="min-h-20 w-full rounded-md border border-zinc-300 px-3 py-2"
        />

        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <p className="font-medium">Itens do cardápio ativo</p>
          {menu?.items.map((item) => {
            const qty = selected[item.id] ?? 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={qty > 0}
                    onChange={(e) => {
                      setSelected((prev) => ({ ...prev, [item.id]: e.target.checked ? Math.max(1, prev[item.id] ?? 1) : 0 }));
                    }}
                  />
                  <span>
                    {item.name} ({centsToBRL(item.priceCents)})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSelected((prev) => ({ ...prev, [item.id]: Number.isNaN(value) ? 0 : value }));
                  }}
                  className="w-24 rounded-md border border-zinc-300 px-2 py-1"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-semibold">Total: {centsToBRL(totalCents)}</p>
          <button
            type="submit"
            disabled={saving || selectedItems.length === 0 || !menu}
            className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar pedido"}
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </section>
  );
}
