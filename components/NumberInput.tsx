import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  readOnly?: boolean;
  className?: string;
  error?: string;
}

export const NumberInput: React.FC<NumberInputProps> = memo(({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder = "0.00",
  min = 0,
  readOnly = false,
  className = "",
  error
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-2 flex justify-between">
        {label}
        {error && <span className="text-red-500 normal-case tracking-normal flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</span>}
      </label>
      
      <div className={`relative flex items-center rounded-2xl transition-all duration-300 group overflow-hidden
        ${error 
          ? 'bg-red-50/50 border border-red-200 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' 
          : readOnly 
            ? 'glass-input opacity-70 cursor-not-allowed bg-slate-50/50' 
            : 'glass-input hover:bg-white/60 focus-within:bg-white/80 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400/50'
        }`}>
        
        {prefix && (
          <div className={`pl-4 flex items-center justify-center h-full pointer-events-none z-10`}>
             <span className={`text-sm font-bold ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-blue-500/80 transition-colors'}`}>{prefix}</span>
          </div>
        )}
        
        <input
          type="number"
          inputMode="decimal" 
          step="0.01"
          min={min}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) val = 0;
            if (val < min) val = min;
            onChange(val);
          }}
          onWheel={(e) => e.currentTarget.blur()}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full py-4 px-4 font-bold text-xl bg-transparent focus:outline-none placeholder:text-slate-300 
            ${error ? 'text-red-600' : 'text-slate-800'} 
            ${prefix ? 'pl-2' : ''} ${suffix ? 'pr-8' : ''}
            transition-all duration-200 relative z-0`}
        />
        
        {suffix && (
          <div className="absolute right-4 pointer-events-none">
             <span className={`text-xs font-bold ${error ? 'text-red-400' : 'text-slate-400'}`}>{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
});