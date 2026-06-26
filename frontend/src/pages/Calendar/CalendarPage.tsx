import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { calendarApi, type CalendarEvent } from '../../api/calendar';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(y: number, m: number): Date {
  return new Date(y, m, 1);
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

const LEGEND = [
  { label: 'Lead', color: '#9CA3AF' },
  { label: 'Cotizado', color: '#60A5FA' },
  { label: 'Depósito', color: '#FBBF24' },
  { label: 'Reservado', color: '#A78BFA' },
  { label: 'Confirmado', color: '#F472B6' },
  { label: 'Completado', color: '#34D399' },
  { label: 'Timeline', color: '#FB923C' },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback((y: number, m: number) => {
    setLoading(true);
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = daysInMonth(y, m);
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    calendarApi.events(start, end)
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDay(toYMD(now));
  };

  // Build grid
  const firstDow = startOfMonth(year, month).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    acc[e.date] = acc[e.date] || [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const todayYMD = toYMD(now);

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  const handleEventClick = (e: CalendarEvent) => {
    if (e.type === 'timeline') navigate(`/eventos/${e.source_id}`);
    else navigate(`/reservas/${e.source_id}`);
  };

  const handleTimelineClick = (e: CalendarEvent, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (e.timeline_id) navigate(`/eventos/${e.timeline_id}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Hoy
          </button>
          <button onClick={prev} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-gray-800 w-44 text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64 text-pink-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const ymd = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                const dayEvents = ymd ? (eventsByDate[ymd] ?? []) : [];
                const isToday = ymd === todayYMD;
                const isSelected = ymd === selectedDay;

                return (
                  <div
                    key={i}
                    onClick={() => ymd && setSelectedDay(isSelected ? null : ymd)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 transition-colors ${
                      day ? 'cursor-pointer hover:bg-pink-50/50' : 'bg-gray-50/30'
                    } ${isSelected ? 'bg-pink-50' : ''}`}
                  >
                    {day && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                          isToday ? 'bg-pink-600 text-white' : 'text-gray-600'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(e => (
                            <div
                              key={e.id}
                              onClick={ev => { ev.stopPropagation(); handleEventClick(e); }}
                              className="truncate text-white text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ background: e.color }}
                              title={e.start_time ? `${e.start_time}–${e.end_time ?? '?'} · ${e.title}` : e.title}
                            >
                              {e.start_time && <span className="opacity-80 mr-0.5">{e.start_time}</span>}
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} más</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedDay ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-800">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-CO', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h2>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400">Sin eventos este día.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(e => (
                    <div
                      key={e.id}
                      onClick={() => handleEventClick(e)}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: e.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                        {e.subtitle && (
                          <p className="text-xs text-gray-400 truncate">{e.subtitle}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {e.start_time && (
                            <p className="text-[10px] text-pink-400 font-medium">
                              {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-300 uppercase tracking-wide">
                            {e.type === 'reservation' ? 'Reserva' : 'Timeline'}
                          </p>
                          {e.has_timeline && e.timeline_id && (
                            <button
                              onClick={ev => handleTimelineClick(e, ev)}
                              className="text-[10px] text-orange-400 hover:text-orange-600 uppercase tracking-wide cursor-pointer"
                            >
                              · Ver evento →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm text-gray-400">Haz clic en un día para ver los eventos.</p>
            </div>
          )}

          {/* Month summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Resumen del mes</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reservas activas</span>
                <span className="font-semibold text-gray-900">
                  {events.filter(e => e.type === 'reservation').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Timelines</span>
                <span className="font-semibold text-gray-900">
                  {events.filter(e => e.type === 'timeline').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Confirmadas</span>
                <span className="font-semibold text-pink-600">
                  {events.filter(e => e.status === 'confirmed').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completadas</span>
                <span className="font-semibold text-green-600">
                  {events.filter(e => e.status === 'completed').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
