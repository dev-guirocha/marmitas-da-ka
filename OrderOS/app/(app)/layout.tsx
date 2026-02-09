import Link from "next/link";
import { LogoutButton } from "./logout-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders/new", label: "Novo Pedido" },
  { href: "/import/site", label: "Import Site" },
  { href: "/production", label: "Produção" },
  { href: "/menu", label: "Cardápio" },
  { href: "/customers", label: "Clientes" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-lg font-semibold">OrderOS</h1>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-zinc-700 hover:text-zinc-900">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
