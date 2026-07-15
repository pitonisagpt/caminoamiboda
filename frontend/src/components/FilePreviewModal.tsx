import { useEffect } from "react";
import { X, Download, FileQuestion } from "lucide-react";

interface FilePreviewModalProps {
  src: string;
  contentType: string;
  fileName: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function FilePreviewModal({ src, contentType, fileName, onClose, onDownload }: FilePreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isImage = contentType.startsWith("image/");
  const isPdf = contentType === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[100dvh] sm:max-h-[95dvh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
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

        <div className="flex-1 min-h-0 overflow-auto bg-gray-900 flex items-center justify-center">
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
    </div>
  );
}
