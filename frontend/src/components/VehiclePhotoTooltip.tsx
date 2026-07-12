import {
  useFloating, useHover, useClick, useDismiss, useInteractions,
  offset, flip, shift, FloatingPortal,
} from '@floating-ui/react';
import { useState } from 'react';
import { Car, User, Phone } from 'lucide-react';

interface VehiclePhotoTooltipProps {
  photoUrl: string | null;
  className: string;
  vehicleName: string;
  licensePlate?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
}

export default function VehiclePhotoTooltip({
  photoUrl,
  className,
  vehicleName,
  licensePlate,
  driverName,
  driverPhone,
  ownerName,
  ownerPhone,
}: VehiclePhotoTooltipProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const hover = useHover(context, { restMs: 40 });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss]);

  if (!photoUrl) return null;

  return (
    <>
      <img
        ref={refs.setReference}
        src={photoUrl}
        alt={vehicleName}
        className={className}
        loading="lazy"
        {...getReferenceProps({
          // The photo usually sits inside a clickable row/card that navigates
          // on click — stop it here so opening/closing the tooltip never
          // triggers that navigation.
          onClick: (e) => e.stopPropagation(),
        })}
      />
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 w-64 bg-white rounded-xl border border-gray-200 shadow-lg p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <Car className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehículo</p>
                <p className="text-sm text-gray-900 font-medium truncate">{vehicleName}</p>
                {licensePlate && <p className="text-xs text-gray-500">{licensePlate}</p>}
              </div>
            </div>
            {driverName && (
              <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conductor</p>
                  <p className="text-sm text-gray-900 truncate">{driverName}</p>
                  {driverPhone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {driverPhone}
                    </p>
                  )}
                </div>
              </div>
            )}
            {ownerName && (
              <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Propietario</p>
                  <p className="text-sm text-gray-900 truncate">{ownerName}</p>
                  {ownerPhone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {ownerPhone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
