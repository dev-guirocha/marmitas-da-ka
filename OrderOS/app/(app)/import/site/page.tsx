"use client";

import { useState } from "react";

type PreviewResponse = {
  parsed: {
    customer: { name: string; email?: string; phone: string };
    delivery: { date?: string; windowLabel?: string; address: string };
    order: {
      planName?: string;
      items: Array<{ qty: number; description: string }>;
      paymentMethod?: string;
      totalCents?: number;
      paymentStatusRaw?: string;
    };
    confidence: { overall: number; missing: string[] };
  };
  rawHash: string;
  itemsHash: string | null;
  alreadyImported: boolean;
  dedupeCandidates: Array<{
    id: string;
    deliveryDate: string;
    createdAt: string;
    totalCents: number;
    statusPedido: string;
    statusPagamento: string;
  }>;
};

function centsToBRL(cents?: number): string {
  if (typeof cents !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function ImportSitePage() {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);

  async function analyze() {
    setLoadingPreview(true);
    setMessage(null);
    setPreview(null);

    try {
      const res = await fetch("/api/import/site/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "Falha ao analisar texto");
        return;
      }

      setPreview(data);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function commit(force = false) {
    setLoadingCommit(true);
    setMessage(null);

    try {
      const res = await fetch("/api/import/site/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, force }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "Falha ao importar");
        return;
      }

      setMessage(`Pedido criado com sucesso: ${data.orderId}`);
    } finally {
      setLoadingCommit(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Importar do Site</h2>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Cole o texto bruto do pedido do site"
        className="min-h-48 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={loadingPreview || !rawText.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loadingPreview ? "Analisando..." : "Analisar"}
        </button>

        <button
          type="button"
          onClick={() => commit(false)}
          disabled={loadingCommit || !rawText.trim()}
          className="rounded-md border border-zinc-300 px-4 py-2 hover:bg-zinc-100 disabled:opacity-50"
        >
          {loadingCommit ? "Confirmando..." : "Confirmar"}
        </button>

        <button
          type="button"
          onClick={() => commit(true)}
          disabled={loadingCommit || !rawText.trim()}
          className="rounded-md border border-amber-400 px-4 py-2 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          Criar mesmo assim
        </button>
      </div>

      {preview ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          <p>
            <strong>Hash:</strong> {preview.rawHash}
          </p>
          <p>
            <strong>ItemsHash:</strong> {preview.itemsHash || "-"}
          </p>
          <p>
            <strong>Cliente:</strong> {preview.parsed.customer.name || "-"} ({preview.parsed.customer.phone || "-"})
          </p>
          <p>
            <strong>Data:</strong> {preview.parsed.delivery.date || "-"}
          </p>
          <p>
            <strong>Endereço:</strong> {preview.parsed.delivery.address || "-"}
          </p>
          <p>
            <strong>Total:</strong> {centsToBRL(preview.parsed.order.totalCents)}
          </p>
          <p>
            <strong>Itens:</strong> {preview.parsed.order.items.map((i) => `${i.qty}x ${i.description}`).join(", ") || "-"}
          </p>
          <p>
            <strong>Confiança:</strong> {preview.parsed.confidence.overall}
          </p>

          {preview.parsed.confidence.missing.length > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
              Campos faltando: {preview.parsed.confidence.missing.join(", ")}
            </div>
          ) : null}

          {preview.alreadyImported ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 text-red-900">
              Esse texto já foi importado (idempotência por hash).
            </div>
          ) : null}

          {preview.dedupeCandidates.length > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
              Possíveis duplicados:{" "}
              {preview.dedupeCandidates
                .map((c) => `${c.id} (${String(c.deliveryDate).slice(0, 10)})`)
                .join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}
