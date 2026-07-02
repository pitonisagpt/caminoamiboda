import { Heart, Loader2, MessageCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { customersApi } from "../../api/customers";
import { Button } from "../../components/ui/Button";
import type { Customer } from "../../types/customer";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("57") ? digits : `57${digits}`;
  const msg = encodeURIComponent(`Hola ${name}, soy de Camino a mi Boda 🌸`);
  return `https://wa.me/${num}?text=${msg}`;
}

export function CustomerList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const [inputSearch, setInputSearch] = useState(q);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (inputSearch) next.set("q", inputSearch); else next.delete("q");
        return next;
      }, { replace: true });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputSearch]);

  useEffect(() => {
    setLoading(true);
    customersApi.list(q || undefined).then((r) => setCustomers(r.data)).finally(() => setLoading(false));
  }, [q]);

  const handleDelete = async (c: Customer) => {
    const name = c.main_contact_name;
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    setDeletingId(c.id);
    try {
      await customersApi.delete(c.id);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} pareja{customers.length !== 1 ? "s" : ""} registrada{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => navigate("/clientes/nuevo")} className="flex items-center gap-2 w-fit">
          <Plus size={16} /> Nuevo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={inputSearch}
          onChange={(e) => setInputSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Heart size={40} className="mx-auto mb-3 text-brand-200" />
          <p>No hay clientes registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Contacto principal</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Novia / Novio</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Boda</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Cómo nos encontró</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.main_contact_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[c.bride_name, c.groom_name].filter(Boolean).join(" & ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.wedding_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.referral_source ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {(c.whatsapp || c.phone) && (
                          <a
                            href={toWhatsAppUrl(c.whatsapp ?? c.phone, c.main_contact_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                            title="WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/clientes/editar/${c.id}`)}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                          title="Eliminar"
                        >
                          {deletingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
