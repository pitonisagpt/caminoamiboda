import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookUser, ExternalLink, Loader2, MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import type { Contact, ContactStatus, ContactType } from '../../types/contact';
import {
  CONTACT_STATUS_COLOR, CONTACT_STATUS_LABEL,
  CONTACT_TYPE_COLOR, CONTACT_TYPE_LABEL,
} from '../../types/contact';

const TYPE_FILTERS: { value: ContactType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'planner', label: 'Organizadores' },
  { value: 'venue', label: 'Venues' },
  { value: 'agency', label: 'Agencias' },
  { value: 'other', label: 'Otros' },
];

const STATUS_FILTERS: { value: ContactStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'prospect', label: 'Prospectos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  if (diff < 365) return `Hace ${Math.floor(diff / 30)} meses`;
  return `Hace ${Math.floor(diff / 365)} años`;
}

export default function ContactList() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [waLoadingId, setWaLoadingId] = useState<number | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = (params: { search?: string; contact_type?: ContactType; status?: ContactStatus } = {}) => {
    setLoading(true);
    contactsApi.list(params)
      .then(r => setContacts(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params: Record<string, string> = {};
    if (typeFilter !== 'all') params.contact_type = typeFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    load(params as any);
  }, [typeFilter, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const params: Record<string, string> = {};
      if (typeFilter !== 'all') params.contact_type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (val) params.search = val;
      load(params as any);
    }, 300);
  };

  const handleWhatsApp = async (c: Contact) => {
    if (!c.phone) return;
    setWaLoadingId(c.id);
    try {
      await contactsApi.markContacted(c.id);
      const phone = c.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, last_contacted_at: new Date().toISOString() } : x));
    } finally {
      setWaLoadingId(null);
    }
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`¿Eliminar a ${c.full_name}?`)) return;
    setDeletingId(c.id);
    try {
      await contactsApi.delete(c.id);
      setContacts(prev => prev.filter(x => x.id !== c.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/contactos/nuevo')}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nuevo contacto
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, ciudad, email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === f.value
                  ? 'bg-pink-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-700'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-gray-200">|</span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-pink-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookUser size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay contactos{search ? ' con esa búsqueda' : ''}.</p>
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Ciudad</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Instagram</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Último contacto</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-pink-50/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/contactos/editar/${c.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 leading-tight">{c.full_name}</p>
                    {c.email && <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTACT_TYPE_COLOR[c.contact_type]}`}>
                      {CONTACT_TYPE_LABEL[c.contact_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.location ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.instagram ? (
                      <a
                        href={`https://instagram.com/${c.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-pink-600 hover:underline text-xs flex items-center gap-1"
                      >
                        {c.instagram} <ExternalLink size={10} />
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTACT_STATUS_COLOR[c.status]}`}>
                      {CONTACT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                    {formatRelativeDate(c.last_contacted_at)}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {c.phone && (
                        <button
                          onClick={() => handleWhatsApp(c)}
                          disabled={waLoadingId === c.id}
                          title="Abrir WhatsApp"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {waLoadingId === c.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : <MessageCircle size={15} />}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/contactos/editar/${c.id}`)}
                        title="Editar"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        title="Eliminar"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === c.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
