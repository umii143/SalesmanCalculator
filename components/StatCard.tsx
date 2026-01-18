import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtext, colorClass = "glass-card" }) => {
  return (
    <div className={`${colorClass} p-5 rounded-2xl flex flex-col justify-between backdrop-blur-md transition-transform hover:scale-[1.02] duration-300`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</span>
        <div className="p-2.5 bg-white/40 rounded-xl text-slate-700 shadow-sm border border-white/50">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-800 tracking-tight">{value}</div>
        {subtext && <div className="text-xs text-slate-500 mt-1 font-medium">{subtext}</div>}
      </div>
    </div>
  );
};