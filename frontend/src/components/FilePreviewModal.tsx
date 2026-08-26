import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download, FileQuestion, ChevronLeft, ChevronRight } from "lucide-react";

interface FilePreviewModalProps {
  src: string;
  contentType: string;
  fileName: string;
  onClose: () => void;
  onDownload?: () => void;
  // Optional next/prev navigation — pass all four when the caller has a
  // list of items to browse (e.g. reservation attachments). Any other
  // caller that omits them gets the exact same modal as before, no arrows.
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { current: number; total: number };
}

export function FilePreviewModal({
  src, contentType, fileName, onClose, onDownload,
  onPrev, onNext, hasPrev, hasNext, position,
}: FilePreviewModalProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const isImage = contentType.startsWith("image/");
  const isPdf = contentType === "application/pdf";

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // Require a clearly horizontal, deliberate swipe so normal vertical
    // scrolling (e.g. a tall image or PDF page) doesn't accidentally
    // trigger navigation.
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && hasNext) onNext?.();
    else if (dx > 0 && hasPrev) onPrev?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[100dvh] sm:max-h-[95dvh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
            {position && (
              <span className="text-xs text-gray-400 shrink-0">{position.current} / {position.total}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onDownload ? (
              <button
                onClick={onDownload}
                className="p-1.5 text-gray-400 hover:text-brand-500 cursor-pointer"
                title="Descargar"
              >
                <Download size={17} />
              </button>
            ) : (
              <a
                href={src}
                download={fileName}
                className="p-1.5 text-gray-400 hover:text-brand-500 cursor-pointer"
                title="Descargar"
              >
                <Download size={17} />
              </a>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 min-h-0 overflow-auto bg-gray-900 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
              aria-label="Siguiente"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {isImage ? (
            <img src={src} alt={fileName} className="max-w-full max-h-[85vh] object-contain" />
          ) : isPdf ? (
            <iframe src={src} title={fileName} className="w-full h-full min-h-[70vh] bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-300 p-10 text-center">
              <FileQuestion size={40} />
              <p className="text-sm">No se puede previsualizar este tipo de archivo.</p>
              <a href={src} download={fileName} className="text-sm text-brand-400 hover:underline">
                Descargarlo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
