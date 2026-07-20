import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface DropzoneProps {
  onFiles: (files: FileList | File[]) => void;
  accept: string;
  multiple?: boolean;
  uploading?: boolean;
  label?: string;
  dragLabel?: string;
  helpText?: string;
  uploadingText?: string;
}

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  uploading = false,
  label = 'Arrastra archivos o haz clic para seleccionar',
  dragLabel = 'Suelta los archivos aquí',
  helpText,
  uploadingText = 'Subiendo...',
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
        px-6 py-8 cursor-pointer transition-colors duration-150
        ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/30'}`}
    >
      {uploading ? (
        <>
          <Loader2 size={24} className="text-brand-400 animate-spin" />
          <p className="text-sm text-brand-700">{uploadingText}</p>
        </>
      ) : (
        <>
          <Upload size={24} className={dragOver ? 'text-brand-500' : 'text-gray-400'} />
          <p className="text-sm font-medium text-gray-600">{dragOver ? dragLabel : label}</p>
          {helpText && <p className="text-xs text-gray-400">{helpText}</p>}
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}
