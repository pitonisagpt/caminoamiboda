import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Edit, FileText, GripVertical, Info, MapPin, Route, Trash2 } from 'lucide-react';
import type { EventLocation, TimelineActivity } from '../../../types/timeline';

export default function SortableActivity({ activity, locations, dayLabel, onEdit, onDelete }: {
  activity: TimelineActivity;
  locations: EventLocation[];
  dayLabel: string | null;
  onEdit: (a: TimelineActivity) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const loc = locations.find(l => l.id === activity.location_id);

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3 group">
      <button {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {dayLabel && (
            <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5 shrink-0">
              {dayLabel}
            </span>
          )}
          <span className="text-sm font-mono font-semibold text-brand-700 shrink-0">{activity.time}</span>
          <span className="text-sm text-gray-900 truncate">{activity.description}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {loc && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {loc.location_name}{loc.address ? ` – ${loc.address}` : ''}
            </span>
          )}
          {loc?.road_access_notes && (
            <span className="text-xs text-amber-600 flex items-center gap-1" title="Acceso vial">
              <Route className="w-3 h-3" /> {loc.road_access_notes}
            </span>
          )}
          {loc?.notes && (
            <span className="text-xs text-gray-400 flex items-center gap-1" title="Notas de la ubicación">
              <FileText className="w-3 h-3" /> {loc.notes}
            </span>
          )}
          {activity.estimated_duration && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.estimated_duration}</span>}
          {activity.notes && <span className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3 h-3" /> {activity.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(activity)} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(activity.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
