import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pencil, Plus, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  onCreateNew?: (query: string) => void;
  createLabel?: string;
  onEdit?: () => void;
}

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  error,
  disabled = false,
  onCreateNew,
  createLabel = 'Crear',
  onEdit,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
    if (e.target.value === '') {
      onChange('');
    }
  }

  function handleSelect(option: ComboboxOption) {
    onChange(option.value);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  }

  const displayValue = open ? query : (query || selectedLabel);

  const inputCls = [
    'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors',
    value && onEdit && !disabled ? 'pr-24' : 'pr-16',
    error ? 'border-red-300' : 'border-gray-200',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900',
  ].join(' ');

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputCls}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
          {value && onEdit && !disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 text-gray-300 hover:text-brand-600 transition-colors cursor-pointer"
              tabIndex={-1}
              title="Editar"
            >
              <Pencil size={13} />
            </button>
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (!disabled) { setOpen(o => !o); inputRef.current?.focus(); } }}
            className="p-1 text-gray-400 cursor-pointer"
            tabIndex={-1}
          >
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          <div ref={listRef}>
            {onCreateNew && query && (
              <div
                onMouseDown={() => { onCreateNew(query); setOpen(false); setQuery(''); setActiveIndex(-1); }}
                className="px-3 py-2.5 text-sm cursor-pointer text-brand-600 font-medium border-b border-gray-100 flex items-center gap-1.5"
              >
                <Plus size={14} /> {createLabel} &ldquo;{query}&rdquo;
              </div>
            )}
            {filtered.length === 0 ? (
              (!onCreateNew || !query) && (
                <div className="px-3 py-2.5 text-sm text-gray-400">Sin resultados</div>
              )
            ) : (
              filtered.map((option, i) => {
                const prevGroup = i > 0 ? filtered[i - 1].group : undefined;
                const showGroupHeader = option.group && option.group !== prevGroup;
                return (
                  <div key={option.value}>
                    {showGroupHeader && (
                      <div className={`px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide border-t border-gray-100 first:border-t-0 ${
                        option.group === 'Fuera de zona' ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        {option.group}
                      </div>
                    )}
                    <div
                      onMouseDown={() => handleSelect(option)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={[
                        'px-3 py-2.5 text-sm cursor-pointer transition-colors',
                        option.value === value ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-800',
                        i === activeIndex && option.value !== value ? 'bg-gray-50' : '',
                      ].join(' ')}
                    >
                      {option.label}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
