import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  duration?: number;
  variant?: 'success' | 'warning';
  onDismiss: () => void;
}

export function Toast({ message, duration = 4000, variant = 'success', onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const isWarning = variant === 'warning';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border shadow-lg rounded-xl px-4 py-3 transition-all duration-300 ${
        isWarning ? 'border-amber-200' : 'border-green-200'
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {isWarning
        ? <AlertTriangle size={18} className="text-amber-500 shrink-0" />
        : <CheckCircle size={18} className="text-green-500 shrink-0" />}
      <span className="text-sm font-medium text-gray-800">{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
