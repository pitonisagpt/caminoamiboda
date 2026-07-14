import { ChevronDown, ChevronUp, Heart, Loader2, MessageCircle, Pencil, Plus, Search, Send, Trash2 } from "lucide-react";
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

function buildWaUrl(phone: string | null, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, "") : "";
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

const TEMPERATURE_BADGE: Record<string, { label: string; className: string }> = {
  frio: { label: "Frío", className: "bg-blue-50 text-blue-600" },
  caliente: { label: "Caliente", className: "bg-red-50 text-red-600" },
};

type SortCol = "main_contact_name" | "couple" | "wedding_date" | "phone" | "referral_source";

const SORT_COLUMNS: [SortCol, string][] = [
  ["main_contact_name", "Contacto principal"],
  ["couple", "Novia / Novio"],
  ["wedding_date", "Boda"],
  ["phone", "Teléfono"],
  ["referral_source", "Cómo nos encontró"],
];

function sortValue(c: Customer, col: SortCol): string {
  switch (col) {
    case "couple": return [c.bride_name, c.groom_name].filter(Boolean).join(" & ");
    case "phone": return c.phone ?? "";
    case "referral_source": return c.referral_source ?? "";
    default: return c[col] ?? "";
  }
}

export function CustomerList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("main_contact_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const [inputSearch, setInputSearch] = useState(q);
  const originFilter = searchParams.get("origen") ?? "";
  const statusFilter = searchParams.get("estado") ?? "";
  const temperatureFilter = searchParams.get("temperatura") ?? "";

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };

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

  const handleSendFollowUp = async (c: Customer) => {
    setSendingId(c.id);
    try {
      const res = await customersApi.whatsappText(c.id);
      const phone = c.whatsapp ?? c.phone;
      window.open(buildWaUrl(phone, res.data.text), "_blank");
    } finally {
      setSendingId(null);
    }
  };

  const originOptions = Array.from(
    new Set(customers.map(c => c.referral_source).filter((v): v is string => Boolean(v)))
  ).sort();

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filteredCustomers = customers
    .filter(c =>
      (!originFilter || c.referral_source === originFilter) &&
      (!statusFilter || c.lead_status === statusFilter) &&
      (!temperatureFilter || c.lead_temperature === temperatureFilter)
    )
    .sort((a, b) => {
      const av = sortValue(a, sortCol).toLowerCase();
      const bv = sortValue(b, sortCol).toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredCustomers.length} de {customers.length} pareja{customers.length !== 1 ? "s" : ""}
            {(originFilter || statusFilter || temperatureFilter) ? " (filtrado)" : ""}
          </p>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={originFilter}
          onChange={(e) => setFilter("origen", e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos los orígenes</option>
          {originOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="flex gap-2">
          {(["", "activo", "archivado"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter("estado", s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === s ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "Todos" : s === "activo" ? "Activo" : "Archivado"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["", "frio", "caliente"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter("temperatura", t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                temperatureFilter === t ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "" ? "Cualquier temperatura" : t === "frio" ? "Frío" : "Caliente"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Heart size={40} className="mx-auto mb-3 text-brand-200" />
          <p>{customers.length === 0 ? "No hay clientes registrados." : "Sin resultados para este filtro."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50">
                  {SORT_COLUMNS.map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="text-left px-4 py-3 font-semibold text-brand-600 cursor-pointer hover:text-brand-800 select-none"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {sortCol === col
                          ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          : <ChevronUp size={12} className="opacity-20" />}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.main_contact_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[c.bride_name, c.groom_name].filter(Boolean).join(" & ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.wedding_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex flex-col gap-1">
                        <span>{c.referral_source ?? "—"}</span>
                        {c.lead_temperature && TEMPERATURE_BADGE[c.lead_temperature] && (
                          <span className={`w-fit px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${TEMPERATURE_BADGE[c.lead_temperature].className}`}>
                            {TEMPERATURE_BADGE[c.lead_temperature].label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {c.lead_temperature && (c.whatsapp || c.phone) && (
                          <button
                            onClick={() => handleSendFollowUp(c)}
                            disabled={sendingId === c.id}
                            className="p-2 rounded-lg text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer disabled:opacity-40"
                            title="Enviar seguimiento de feria por WhatsApp"
                          >
                            {sendingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          </button>
                        )}
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
