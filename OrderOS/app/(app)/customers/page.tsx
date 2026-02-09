"use client";

import { FormEvent, useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  addressText?: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressText, setAddressText] = useState("");

  async function load(currentSearch = "") {
    const query = currentSearch ? `?search=${encodeURIComponent(currentSearch)}` : "";
    const res = await fetch(`/api/customers${query}`, { cache: "no-store" });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/customers", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setCustomers([]);
      });

    return () => controller.abort();
  }, []);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await load(search);
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, addressText }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.message || "Erro ao criar cliente");
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setAddressText("");
    setMessage("Cliente criado");
    await load(search);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Clientes</h2>

      <form onSubmit={onSearch} className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
          Buscar
        </button>
      </form>

      <form onSubmit={createCustomer} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="rounded-md border border-zinc-300 px-3 py-2"
          required
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone"
          className="rounded-md border border-zinc-300 px-3 py-2"
          required
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          placeholder="Endereço"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-white md:col-span-2">
          Criar cliente
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Endereço</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">{customer.name}</td>
                <td className="px-3 py-2">{customer.phone}</td>
                <td className="px-3 py-2">{customer.email || "-"}</td>
                <td className="px-3 py-2">{customer.addressText || "-"}</td>
              </tr>
            ))}
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}
