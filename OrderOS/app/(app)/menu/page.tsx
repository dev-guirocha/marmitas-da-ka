"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: string;
  menuId: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

type Menu = {
  id: string;
  name: string;
  monthRef: string;
  isActive: boolean;
  items: MenuItem[];
};

function centsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function MenuPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuName, setMenuName] = useState("");
  const [monthRef, setMonthRef] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function applyMenus(nextMenus: Menu[]) {
    setMenus(nextMenus);
    setSelectedMenuId((prev) => {
      if (prev && nextMenus.some((menu) => menu.id === prev)) {
        return prev;
      }

      const fallback = nextMenus.find((menu) => menu.isActive) ?? nextMenus[0];
      return fallback?.id ?? "";
    });
  }

  async function load() {
    const res = await fetch("/api/menus", { cache: "no-store" });
    const data = await res.json();
    applyMenus(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/menus", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        applyMenus(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        applyMenus([]);
      });

    return () => controller.abort();
  }, []);

  const selectedMenu = useMemo(() => {
    return menus.find((menu) => menu.id === selectedMenuId) ?? menus.find((menu) => menu.isActive) ?? menus[0];
  }, [menus, selectedMenuId]);

  async function createMenu(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const res = await fetch("/api/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: menuName, monthRef }),
    });

    if (!res.ok) {
      setMessage("Erro ao criar cardápio");
      return;
    }

    setMenuName("");
    setMonthRef("");
    await load();
    setMessage("Cardápio criado");
  }

  async function activateMenu(id: string) {
    await fetch("/api/menus", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    const menuId = selectedMenu?.id ?? selectedMenuId;
    if (!menuId) return;

    const res = await fetch("/api/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuId,
        name: itemName,
        priceCents: itemPrice,
        isActive: true,
      }),
    });

    if (!res.ok) {
      setMessage("Erro ao criar item");
      return;
    }

    setItemName("");
    setItemPrice(0);
    await load();
    setMessage("Item adicionado");
  }

  async function toggleItem(item: MenuItem) {
    await fetch(`/api/menu-items?id=${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await load();
  }

  async function updateItem(item: MenuItem, nextName: string, nextPrice: number) {
    await fetch(`/api/menu-items?id=${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName, priceCents: nextPrice }),
    });
    await load();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Cardápio</h2>

      <form onSubmit={createMenu} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-4">
        <input
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          placeholder="Nome do cardápio"
          className="rounded-md border border-zinc-300 px-3 py-2"
          required
        />
        <input
          value={monthRef}
          onChange={(e) => setMonthRef(e.target.value)}
          placeholder="YYYY-MM"
          className="rounded-md border border-zinc-300 px-3 py-2"
          pattern="\d{4}-\d{2}"
          required
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-white">
          Criar menu
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="mb-2 font-medium">Menus</p>
        <div className="space-y-2">
          {menus.map((menu) => (
            <div key={menu.id} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2">
              <div>
                <p className="font-medium">
                  {menu.name} ({menu.monthRef}) {menu.isActive ? "• ATIVO" : ""}
                </p>
                <p className="text-sm text-zinc-500">{menu.items.length} itens</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMenuId(menu.id)}
                  className="rounded-md border border-zinc-300 px-2 py-1"
                >
                  Ver itens
                </button>
                {!menu.isActive ? (
                  <button
                    type="button"
                    onClick={() => activateMenu(menu.id)}
                    className="rounded-md border border-zinc-300 px-2 py-1"
                  >
                    Ativar
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMenu ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="font-medium">Itens de {selectedMenu.name}</p>

          <form onSubmit={addItem} className="grid gap-3 md:grid-cols-4">
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Nome do item"
              className="rounded-md border border-zinc-300 px-3 py-2"
              required
            />
            <input
              type="number"
              min={0}
              value={itemPrice}
              onChange={(e) => setItemPrice(Number(e.target.value))}
              placeholder="Preço em centavos"
              className="rounded-md border border-zinc-300 px-3 py-2"
              required
            />
            <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-white">
              Adicionar item
            </button>
          </form>

          <div className="space-y-2">
            {selectedMenu.items.map((item) => (
              <MenuItemEditor key={item.id} item={item} onSave={updateItem} onToggle={toggleItem} />
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}

function MenuItemEditor({
  item,
  onSave,
  onToggle,
}: {
  item: MenuItem;
  onSave: (item: MenuItem, nextName: string, nextPrice: number) => Promise<void>;
  onToggle: (item: MenuItem) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [priceCents, setPriceCents] = useState(item.priceCents);

  return (
    <div className="grid gap-2 rounded border border-zinc-200 p-3 md:grid-cols-[1fr_140px_auto_auto]">
      <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2" />
      <input
        type="number"
        min={0}
        value={priceCents}
        onChange={(e) => setPriceCents(Number(e.target.value))}
        className="rounded-md border border-zinc-300 px-3 py-2"
      />
      <button
        type="button"
        onClick={() => onSave(item, name, priceCents)}
        className="rounded-md border border-zinc-300 px-3 py-2"
      >
        Salvar ({centsToBRL(priceCents)})
      </button>
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="rounded-md border border-zinc-300 px-3 py-2"
      >
        {item.isActive ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
