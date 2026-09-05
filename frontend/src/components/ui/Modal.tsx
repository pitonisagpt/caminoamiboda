import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

const EXIT_MS = 200;

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  size?: Size;
}

/**
 * Shared modal shell — centered dialog on desktop, bottom sheet on mobile
 * (drag the handle/header down to dismiss). Consolidates patterns already
 * proven separately across the app rather than inventing new ones:
 * createPortal + Escape + body-scroll-lock (FilePreviewModal.tsx/
 * VehicleModal.tsx), a bottom-sheet layout (CatalogPage.tsx's mobile
 * filter drawer), and the fade/slide open-close choreography (Toast.tsx's
 * requestAnimationFrame + setTimeout pattern) — no single one of the
 * ~17 modal implementations in the app combined all of these before.
 *
 * Scope: the 9 byte-identical "quick create" dialogs (ReservationForm.tsx,
 * EventoTab.tsx, TimelineDetail.tsx). The other ~8 modals in the app are
 * each different enough (sizes, existing backdrop/escape behavior) that
 * migrating them is a separate pass — see wishlist fila 50.
 */
export function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps) {
  const [visible, setVisible] = useState(false);

  // Animated close (backdrop/Escape/X): fade+slide out, then unmount.
  // Distinct from the swipe-to-dismiss path below, which already slides
  // the panel off-screen itself before calling the raw onClose directly.
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, EXIT_MS);
  };

  const { ref: sheetRef, ...swipeHandlers } = useSwipeToDismiss({ onDismiss: onClose });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        ref={sheetRef}
        className={`relative z-10 bg-white w-full ${SIZE_CLASSES[size]} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 sm:scale-100 opacity-100' : 'translate-y-full sm:translate-y-4 sm:scale-95 opacity-0'
        }`}
      >
        {/* Drag handle + header — the grabbable region for swipe-to-dismiss.
            Deliberately not spread onto the scrollable body below: dragging
            tall form content and dismissing the sheet are both vertical
            gestures, so they'd fight over the same touch there. */}
        <div {...swipeHandlers} className="shrink-0">
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
