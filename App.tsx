
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Fuel, Droplet, Wallet, ArrowRight, ArrowLeft, Save, 
  Settings, Search, History, X, CheckCircle, BarChart3,
  UserCircle, ShieldCheck, Zap, LayoutDashboard, Share2, Printer, MessageCircle, Loader2, Sparkles,
  Banknote, Coins, CreditCard, Landmark, Calculator, ArrowDownCircle, ArrowUpCircle, RotateCcw,
  Sun, Moon, PenTool, RefreshCw, Plus, Trash2, AlignLeft, GripHorizontal, HelpCircle, BookOpen, Phone,
  Users, StickyNote, TrendingUp, TrendingDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { FuelType, NozzleReading, Financials, Prices, HistoryEntry, ShiftType, CashBreakdown, CreditCustomer } from './types';
import { NumberInput } from './components/NumberInput';
import { generateShiftAnalysis } from './services/geminiService';

// --- Constants ---
const INITIAL_NOZZLES: NozzleReading[] = [
  { id: 1, name: 'Nozzle 1', type: FuelType.PETROL, opening: 0, closing: 0 },
  { id: 2, name: 'Nozzle 2', type: FuelType.PETROL, opening: 0, closing: 0 },
  { id: 3, name: 'Nozzle 3', type: FuelType.DIESEL, opening: 0, closing: 0 },
  { id: 4, name: 'Nozzle 4', type: FuelType.DIESEL, opening: 0, closing: 0 },
];

const INITIAL_CASH_BREAKDOWN: CashBreakdown = { n5000: 0, n1000: 0, n500: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 };

const INITIAL_FINANCIALS: Financials = {
  openingBalance: 0, expenses: 0, credits: 0, creditList: [], recoveries: 0, lubeSales: 0,
  physicalCash: 0, cashBreakdown: INITIAL_CASH_BREAKDOWN, 
  bankDeposit: 0, digitalPayments: 0, testLitersPetrol: 0, testLitersDiesel: 0,
};

const DEFAULT_PRICES: Prices = { petrol: 280.00, diesel: 290.00 };

enum Step { HOME = 0, PETROL = 1, DIESEL = 2, TESTS = 3, FINANCIALS = 4, SUMMARY = 5 }
type FinancialSubTab = 'INFLOW' | 'OUTFLOW' | 'COUNTER';
type ReportPeriod = 'ALL' | 'WEEK' | 'MONTH';

// --- HELPER: Meter Rollover Logic ---
const calculateLitersSold = (opening: number, closing: number): { sold: number, isRollover: boolean } => {
  if (closing === 0 && opening > 0) return { sold: 0, isRollover: false };
  if (closing >= opening) return { sold: closing - opening, isRollover: false };
  const digits = Math.floor(Math.log10(opening)) + 1;
  const power = Math.pow(10, digits);
  const sold = (power + closing) - opening;
  return { sold, isRollover: true };
};

// --- SUB-COMPONENTS FOR NEW FEATURES ---

const CashTally = ({ breakdown, onChange }: { breakdown: CashBreakdown, onChange: (b: CashBreakdown) => void }) => {
  const total = useMemo(() => {
    return (breakdown.n5000 * 5000) + (breakdown.n1000 * 1000) + (breakdown.n500 * 500) + 
           (breakdown.n100 * 100) + (breakdown.n50 * 50) + (breakdown.n20 * 20) + 
           (breakdown.n10 * 10) + (breakdown.coins || 0);
  }, [breakdown]);

  const handleChange = (key: keyof CashBreakdown, val: number) => {
    onChange({ ...breakdown, [key]: val });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-blue-600 dark:bg-indigo-600 p-6 rounded-3xl text-white shadow-lg flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-80">Total Cash Counted</h3>
          <p className="text-3xl font-black">Rs {total.toLocaleString()}</p>
        </div>
        <Banknote className="w-10 h-10 opacity-30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
         {[
           { k: 'n5000', l: '5000', c: 'text-amber-600' }, { k: 'n1000', l: '1000', c: 'text-blue-600' },
           { k: 'n500', l: '500', c: 'text-emerald-600' }, { k: 'n100', l: '100', c: 'text-red-600' },
           { k: 'n50', l: '50', c: 'text-purple-600' }, { k: 'n20', l: '20', c: 'text-orange-600' },
           { k: 'n10', l: '10', c: 'text-teal-600' }, { k: 'coins', l: 'Coins', c: 'text-slate-600' }
         ].map((item) => (
           <div key={item.k} className="flex items-center gap-2 bg-white/60 dark:bg-slate-700/60 p-3 rounded-2xl border border-white/50 dark:border-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
              <span className={`text-[11px] font-black w-10 ${item.c} dark:text-slate-300`}>{item.l}</span>
              <span className="text-slate-300 dark:text-slate-500 text-xs">x</span>
              <input 
                type="number" 
                className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none text-right text-lg" 
                placeholder="0"
                value={(breakdown as any)[item.k] || ''}
                onChange={(e) => handleChange(item.k as keyof CashBreakdown, parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
              />
           </div>
         ))}
      </div>
    </div>
  );
};

// Independent Customer Ledger Page
const CustomerLedgerModal = ({ show, onClose, customers, onChange }: { show: boolean, onClose: () => void, customers: CreditCustomer[], onChange: (c: CreditCustomer[]) => void }) => {
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  const addCustomer = () => {
    if (!newName || !newAmount) return;
    const newCust: CreditCustomer = {
      id: Date.now().toString(),
      name: newName,
      amount: parseFloat(newAmount),
      vehicleNo: newVehicle
    };
    onChange([...customers, newCust]);
    setNewName("");
    setNewAmount("");
    setNewVehicle("");
  };

  const removeCustomer = (id: string) => {
    onChange(customers.filter(c => c.id !== id));
  };

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'opacity-100 visible backdrop-blur-md' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose}></div>
      <div className={`glass-panel w-full max-w-md rounded-[2rem] p-0 relative z-10 overflow-hidden transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
         
         <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white relative">
             <h3 className="text-2xl font-bold flex items-center gap-3"><Users className="w-6 h-6" /> Customer Ledger</h3>
             <p className="text-red-100 text-sm opacity-90">Manage Shift Credits</p>
             <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><X className="w-5 h-5" /></button>
         </div>

         <div className="p-6">
            <div className="flex flex-col gap-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                    <input 
                    placeholder="Name" 
                    className="flex-[2] bg-white dark:bg-slate-700 p-3 rounded-xl text-sm font-bold outline-none border border-slate-200 dark:border-slate-600 dark:text-white"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    />
                    <input 
                    type="number" 
                    placeholder="Rs" 
                    className="flex-1 bg-white dark:bg-slate-700 p-3 rounded-xl text-sm font-bold outline-none border border-slate-200 dark:border-slate-600 dark:text-white"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <input 
                        placeholder="Vehicle No (Optional)" 
                        className="flex-1 bg-white dark:bg-slate-700 p-3 rounded-xl text-xs font-bold outline-none border border-slate-200 dark:border-slate-600 dark:text-white"
                        value={newVehicle}
                        onChange={e => setNewVehicle(e.target.value)}
                    />
                    <button onClick={addCustomer} className="px-6 bg-slate-900 dark:bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 font-bold text-sm">Add</button>
                </div>
            </div>
            
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {customers.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white/80 dark:bg-slate-700/60 p-4 rounded-2xl border border-white/50 dark:border-slate-600 shadow-sm">
                    <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">{c.name}</div>
                        {c.vehicleNo && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block mt-1">{c.vehicleNo}</div>}
                    </div>
                    <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">Rs {c.amount.toLocaleString()}</span>
                    <button onClick={() => removeCustomer(c.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
                ))}
                {customers.length === 0 && (
                    <div className="text-center py-8 opacity-50">
                        <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs text-slate-400 font-medium">No customers added for this shift.</p>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Total Credits:</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">Rs {customers.reduce((s,c)=>s+c.amount,0).toLocaleString()}</span>
            </div>
         </div>
      </div>
    </div>
  );
};

// --- GUIDE MODAL ---
const GuideModal = memo(({ show, onClose }: { show: boolean, onClose: () => void }) => {
  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'opacity-100 visible backdrop-blur-md' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose}></div>
      <div className={`glass-panel w-full max-w-md rounded-[2rem] p-0 relative z-10 overflow-hidden transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
         <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
            <h2 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-6 h-6" /> User Guide</h2>
            <p className="text-blue-100 text-sm opacity-90">App Istemal Karne Ka Tarika</p>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><X className="w-5 h-5" /></button>
         </div>
         
         <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 font-black border border-blue-200 dark:border-blue-700">1</div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Shift Shuru Karein</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Apna naam likhein aur <strong>Day</strong> ya <strong>Night</strong> shift select karein.
                  <br/><span className="text-xs text-slate-500 italic">(Enter name and select shift mode)</span>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 font-black border border-amber-200 dark:border-amber-700">2</div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Meter Readings</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Agar Opening reading pehle se likhi hui hai to usay change na karein. Sirf <strong>Closing Reading</strong> likhein. 
                  <br/><span className="text-xs text-slate-500 italic">(Enter closing meters only. Opening auto-fills)</span>
                </p>
              </div>
            </div>

             {/* Step 3 */}
             <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-200 dark:border-emerald-700">3</div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Cash & Udhaar</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Kharcha (Expenses) aur Udhaar (Credits) total amount likhein.
                  <br/>
                  <strong>Customers List:</strong> Agar customers ka naam save karna hai to upar <Users className="w-3 h-3 inline text-blue-500" /> button dabayein.
                  <br/><span className="text-xs text-slate-500 italic">(Enter total expenses and credits)</span>
                </p>
              </div>
            </div>

             {/* Step 4 */}
             <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400 font-black border border-purple-200 dark:border-purple-700">4</div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Save & Close</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Akhir mein summary check karein aur <strong>Close Shift</strong> dabayein taake aglay shift ke liye meters save ho jayen.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-2">Developer Information</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Developed by <span className="font-bold text-blue-600">UMAR ALI</span></p>
              <a href="tel:03168432329" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors">
                <Phone className="w-3 h-3" /> 0316-8432329
              </a>
            </div>

         </div>
      </div>
    </div>
  );
});


// --- FOOTER COMPONENT ---
const DeveloperFooter = memo(() => (
  <div className="mt-8 mb-2 text-center animate-fade-in">
    <a 
      href="https://wa.me/923168432329" 
      target="_blank" 
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/80 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-700 hover:shadow-emerald-500/20 hover:ring-emerald-100 dark:hover:ring-emerald-900"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-50/50 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
        Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 font-black ml-1 text-xs">UMAR ALI</span>
      </span>
      <div className="relative z-10 p-1.5 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-all duration-500 shadow-sm">
         <Sparkles className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white transition-colors duration-500" />
      </div>
    </a>
  </div>
));

// --- HEADER COMPONENT ---
const Header = memo(({ 
  currentTime, onHome, onHistory, onSettings, theme, onToggleTheme, onGuide, onCustomers
}: { 
  currentTime: Date, onHome: () => void, onHistory: () => void, onSettings: () => void, theme: 'light'|'dark', onToggleTheme: () => void, onGuide: () => void, onCustomers: () => void
}) => (
  <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/40 dark:border-slate-700/50 shadow-sm supports-[backdrop-filter]:bg-white/50"></div>
    <div className="relative max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform group" onClick={onHome}>
         <div className="w-11 h-11 bg-gradient-to-br from-slate-800 to-black dark:from-indigo-600 dark:to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-slate-500/30 transition-all duration-300 border border-white/20 relative overflow-hidden">
           <Fuel className="text-white w-5 h-5 relative z-10" />
         </div>
         <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-none tracking-tight">Motorway</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Petroleum</p>
         </div>
      </div>
      
      <div className="flex items-center gap-2">
         {/* Customers Button (New) */}
         <button onClick={onCustomers} className="p-2.5 glass-button rounded-full text-rose-600 dark:text-rose-400 active:scale-90 transition-transform hover:bg-white/80 dark:hover:bg-slate-700 relative">
            <Users className="w-5 h-5" />
         </button>

         {/* Guide Button */}
         <button onClick={onGuide} className="p-2.5 glass-button rounded-full text-blue-600 dark:text-blue-400 active:scale-90 transition-transform hover:bg-white/80 dark:hover:bg-slate-700">
            <HelpCircle className="w-5 h-5" />
         </button>

         <button onClick={onToggleTheme} className="hidden sm:block p-2.5 glass-button rounded-full text-slate-700 dark:text-slate-200 active:scale-90 transition-transform hover:bg-white/80 dark:hover:bg-slate-700">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
         </button>
         <button onClick={onHistory} className="p-2.5 glass-button rounded-full text-slate-700 dark:text-slate-200 active:scale-90 transition-transform hover:bg-white/80 dark:hover:bg-slate-700">
           <BarChart3 className="w-5 h-5" />
         </button>
         <button onClick={onSettings} className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg active:scale-90 transition-transform border border-slate-700 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-200">
           <Settings className="w-5 h-5" />
         </button>
      </div>
    </div>
  </header>
));

// --- MODALS ---
const SettingsModal = memo(({ show, onClose, prices, onPriceChange, lastReadings, onCalibrationUpdate }: any) => {
    const [tab, setTab] = useState<'rates' | 'calibration'>('rates');

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-500 ${show ? 'opacity-100 visible backdrop-blur-sm' : 'opacity-0 invisible pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/40 transition-opacity duration-500" onClick={onClose}></div>
            <div className={`glass-panel rounded-[2.5rem] shadow-2xl w-full max-w-sm p-0 relative z-10 transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-90 translate-y-12'}`}>
                <div className="flex border-b border-slate-200/20">
                    <button onClick={() => setTab('rates')} className={`flex-1 p-4 font-bold text-sm ${tab === 'rates' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'} rounded-tl-[2.5rem]`}>Fuel Rates</button>
                    <button onClick={() => setTab('calibration')} className={`flex-1 p-4 font-bold text-sm ${tab === 'calibration' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'} rounded-tr-[2.5rem]`}>Meter Calibration</button>
                </div>
                
                <div className="p-8">
                    {tab === 'rates' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Banknote className="w-5 h-5 text-green-600" /></span> Today's Prices
                            </h3>
                            <NumberInput label="Petrol Rate" value={prices.petrol} onChange={(v:number) => onPriceChange({...prices, petrol: v})} prefix="Rs" />
                            <NumberInput label="Diesel Rate" value={prices.diesel} onChange={(v:number) => onPriceChange({...prices, diesel: v})} prefix="Rs" />
                        </div>
                    )}
                    {tab === 'calibration' && (
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><RefreshCw className="w-5 h-5 text-orange-600" /></span> Reset Meters
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Set the <strong>Current Opening</strong> readings manually here if they are incorrect.</p>
                            {lastReadings.map((reading: any, idx: number) => (
                                <NumberInput 
                                    key={reading.id} 
                                    label={`${reading.name} (${reading.type})`} 
                                    value={reading.closing} 
                                    onChange={(v) => {
                                        const updated = [...lastReadings];
                                        updated[idx] = { ...updated[idx], closing: v };
                                        onCalibrationUpdate(updated);
                                    }} 
                                />
                            ))}
                        </div>
                    )}
                    <button onClick={onClose} className="mt-8 w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all hover:bg-black dark:hover:bg-indigo-500">Done</button>
                </div>
            </div>
        </div>
    );
});

const HistoryModal = memo(({ show, onClose, history, onFilterChange }: any) => {
    const [localSearch, setLocalSearch] = useState("");
    const [period, setPeriod] = useState<ReportPeriod>('ALL');
    useEffect(() => { onFilterChange(period); }, [period, onFilterChange]);
    const filtered = useMemo(() => {
        if (!localSearch) return history;
        return history.filter((h:any) => h.salesmanName.toLowerCase().includes(localSearch.toLowerCase()) || h.date.includes(localSearch));
    }, [history, localSearch]);
    return (
        <div className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 transition-all duration-500 ${show ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className={`glass-panel rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl h-[92vh] sm:h-[85vh] flex flex-col relative z-10 transform transition-all duration-500 ${show ? 'translate-y-0' : 'translate-y-full sm:translate-y-20'}`}>
            <div className="p-6 border-b border-white/30 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">History</h2>
                <button onClick={onClose} className="p-2.5 bg-white/50 dark:bg-slate-700/50 rounded-full hover:bg-white/80 transition-colors"><X className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
            </div>
            <div className="flex bg-white/30 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-5 shadow-inner backdrop-blur-sm">
                {(['ALL', 'WEEK', 'MONTH'] as ReportPeriod[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${period === p ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>{p}</button>
                ))}
            </div>
            <div className="glass-input px-4 py-3 rounded-2xl flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Search..." className="bg-transparent text-sm font-semibold outline-none w-full placeholder:text-slate-400 text-slate-800 dark:text-white" value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
            </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {filtered.map((entry:any) => (
                <div key={entry.id} className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-3xl border border-white/60 dark:border-slate-700 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="font-bold text-slate-800 dark:text-white block">{entry.salesmanName}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{entry.shift} Shift</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${entry.shortageExcess >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{entry.shortageExcess >= 0 ? '+' : ''}{entry.shortageExcess}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.date}</div>
                </div>
            ))}
            </div>
        </div>
        </div>
    );
});

// --- HOME VIEW ---
const HomeView = memo(({ greeting, salesmanName, onNameChange, onStart, onHistory, shift, setShift, prices }: any) => (
  <div className="flex flex-col items-center min-h-[100dvh] pt-28 pb-10 px-4 animate-in fade-in zoom-in duration-700 w-full relative overflow-x-hidden">
     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-400/30 rounded-full blur-[100px] -z-10 animate-blob mix-blend-multiply dark:mix-blend-normal dark:opacity-20"></div>
     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/30 rounded-full blur-[80px] -z-10 animate-blob animation-delay-2000 translate-x-12 mix-blend-multiply dark:mix-blend-normal dark:opacity-20"></div>

     <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] shadow-float max-w-sm w-full relative overflow-hidden group my-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

        <div className="flex justify-center gap-3 mb-8">
            <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex flex-col items-center min-w-[100px]">
                <span className="text-[9px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Petrol</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white">Rs {prices.petrol}</span>
            </div>
            <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center min-w-[100px]">
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Diesel</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white">Rs {prices.diesel}</span>
            </div>
        </div>

        <div className="text-center mb-8 relative">
           <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight text-gradient-animate">{greeting}</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-2">Ready to track today's sales?</p>
        </div>

        <div className="space-y-5 relative z-10">
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner relative">
                <div className={`absolute top-1 bottom-1 w-[48%] bg-white dark:bg-slate-600 shadow-sm rounded-xl transition-all duration-300 ${shift === 'DAY' ? 'left-1' : 'left-[51%]'}`}></div>
                <button onClick={() => setShift('DAY')} className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${shift === 'DAY' ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>Day Shift</button>
                <button onClick={() => setShift('NIGHT')} className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${shift === 'NIGHT' ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>Night Shift</button>
           </div>

           <div className="glass-input p-2 rounded-3xl transition-all focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white/60 dark:focus-within:bg-slate-800/60">
             <div className="flex items-center px-4 py-2">
                <UserCircle className="w-6 h-6 text-slate-400 mr-3" />
                <input 
                  type="text"
                  value={salesmanName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Salesman Name"
                  className="w-full py-2 bg-transparent font-bold text-slate-800 dark:text-white text-lg placeholder:text-slate-400/70 focus:outline-none"
                />
             </div>
           </div>

           <button onClick={onStart} className="group w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:shadow-blue-500/50 hover:-translate-y-1 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
              <span className="relative flex items-center gap-3">Start Shift <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
            </button>
        </div>

        <div className="mt-8 text-center">
          <DeveloperFooter />
        </div>
     </div>
  </div>
));

// --- STEP WIZARD ---
const StepWizard = memo(({ 
  step, nozzles, financials, calculations, aiReport, isGeneratingReport, 
  onNozzleChange, onFinancialChange, onGenerateReport, onSave, onNext, onBack, salesmanName, currentTime, shift,
  notes, onNotesChange
}: any) => {

  const [finTab, setFinTab] = useState<FinancialSubTab>('INFLOW');
  
  const handlePrint = () => window.print();

  const handleCashTallyChange = useCallback((b: CashBreakdown) => {
    // Calculate total from denominations
    const total = (b.n5000 * 5000) + (b.n1000 * 1000) + (b.n500 * 500) + 
                  (b.n100 * 100) + (b.n50 * 50) + (b.n20 * 20) + 
                  (b.n10 * 10) + (b.coins || 0);
    // Update financials with breakdown AND the total amount
    onFinancialChange('cashBreakdown', b);
    onFinancialChange('physicalCash', total);
  }, [onFinancialChange]);

  const renderStepContent = () => {
      switch(step) {
          case Step.PETROL:
              return (
                <div className="space-y-6 relative z-10 animate-slide-in-right">
                    <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Petrol Readings</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Super PMS</p>
                    </div>
                    {nozzles.filter((n:any) => n.type === FuelType.PETROL).map((n:any) => {
                        const { sold, isRollover } = calculateLitersSold(n.opening, n.closing);
                        const hasDiff = n.closing !== 0 || n.opening !== 0;

                        return (
                            <div key={n.id} className="glass-card p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300 border border-white/80 dark:border-slate-700 group">
                                <div className="flex justify-between items-center mb-4 pl-1">
                                    <span className="font-bold text-base text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{n.name}</span>
                                    <div className="flex items-center gap-2">
                                        {isRollover && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Rollover</span>}
                                        <span className="text-[10px] bg-amber-100/80 text-amber-800 px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm">PMS</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5 mb-4 relative">
                                    <NumberInput 
                                        label="Opening" 
                                        value={n.opening} 
                                        onChange={(v) => onNozzleChange(n.id, 'opening', v)} 
                                    />
                                    <NumberInput label="Closing" value={n.closing} onChange={(v) => onNozzleChange(n.id, 'closing', v)} />
                                </div>
                                {hasDiff && <div className={`mt-2 p-3 rounded-xl flex justify-between items-center transition-all duration-500 ${sold > 0 ? 'bg-amber-50/80 dark:bg-amber-900/20' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sold</span><span className="font-black text-lg text-slate-800 dark:text-white">{sold.toFixed(2)} <span className="text-sm font-bold text-slate-400">L</span></span></div>}
                            </div>
                        );
                    })}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-3xl flex justify-between items-center border border-amber-100/60 dark:border-amber-800/30 shadow-inner">
                        <span className="text-xs font-bold text-amber-900/60 dark:text-amber-500/60 uppercase tracking-widest">Total Sales</span>
                        <span className="text-3xl font-black text-amber-600 drop-shadow-sm">{calculations.petrolSold.toFixed(2)} <span className="text-lg text-amber-600/60">L</span></span>
                    </div>
                </div>
              );
          case Step.DIESEL:
              return (
                <div className="space-y-6 relative z-10 animate-slide-in-right">
                    <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Diesel Readings</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">High Speed Diesel</p>
                    </div>
                    {nozzles.filter((n:any) => n.type === FuelType.DIESEL).map((n:any) => {
                        const { sold, isRollover } = calculateLitersSold(n.opening, n.closing);
                        const hasDiff = n.closing !== 0 || n.opening !== 0;

                        return (
                            <div key={n.id} className="glass-card p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300 border border-white/80 dark:border-slate-700 group">
                                <div className="flex justify-between items-center mb-4 pl-1">
                                    <span className="font-bold text-base text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{n.name}</span>
                                    <div className="flex items-center gap-2">
                                        {isRollover && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Rollover</span>}
                                        <span className="text-[10px] bg-slate-200/80 text-slate-700 px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm">HSD</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5 mb-4 relative">
                                    <NumberInput 
                                        label="Opening" 
                                        value={n.opening} 
                                        onChange={(v) => onNozzleChange(n.id, 'opening', v)} 
                                    />
                                    <NumberInput label="Closing" value={n.closing} onChange={(v) => onNozzleChange(n.id, 'closing', v)} />
                                </div>
                                {hasDiff && <div className={`mt-2 p-3 rounded-xl flex justify-between items-center transition-all duration-500 ${sold > 0 ? 'bg-slate-100/80 dark:bg-slate-800/80' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sold</span><span className="font-black text-lg text-slate-800 dark:text-white">{sold.toFixed(2)} <span className="text-sm font-bold text-slate-400">L</span></span></div>}
                            </div>
                        );
                    })}
                    <div className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 p-5 rounded-3xl flex justify-between items-center border border-slate-200/60 dark:border-slate-700 shadow-inner">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Sales</span>
                    <span className="text-3xl font-black text-slate-700 dark:text-slate-300 drop-shadow-sm">{calculations.dieselSold.toFixed(2)} <span className="text-lg text-slate-500/60">L</span></span>
                    </div>
                </div>
              );
          case Step.TESTS:
              return (
                <div className="space-y-8 relative z-10 animate-slide-in-right">
                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Quality Tests</h2>
                        <p className="text-slate-500 text-sm mt-1">Enter any test liters used</p>
                    </div>
                    <div className="glass-card p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-700 space-y-6 shadow-md">
                    <NumberInput label="Petrol Tests" value={financials.testLitersPetrol} onChange={(v) => onFinancialChange('testLitersPetrol', v)} suffix="L" />
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent w-full" />
                    <NumberInput label="Diesel Tests" value={financials.testLitersDiesel} onChange={(v) => onFinancialChange('testLitersDiesel', v)} suffix="L" />
                    </div>
                </div>
              );
          case Step.FINANCIALS:
              return (
                <div className="space-y-6 relative z-10 animate-slide-in-right">
                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Financial Flow</h2>
                        <p className="text-slate-500 text-sm mt-1">Manage shift ins and outs</p>
                    </div>

                    {/* Sub-tabs Selection */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[1.5rem] shadow-inner relative">
                        <div className={`absolute top-1 bottom-1 w-[32%] bg-white dark:bg-slate-600 shadow-sm rounded-2xl transition-all duration-300 ${finTab === 'INFLOW' ? 'left-1' : finTab === 'OUTFLOW' ? 'left-[34%]' : 'left-[67%]'}`}></div>
                        <button onClick={() => setFinTab('INFLOW')} className={`flex-1 relative z-10 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center transition-colors ${finTab === 'INFLOW' ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                          <TrendingUp className="w-4 h-4 mb-1" /> Inflow
                        </button>
                        <button onClick={() => setFinTab('OUTFLOW')} className={`flex-1 relative z-10 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center transition-colors ${finTab === 'OUTFLOW' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                          <TrendingDown className="w-4 h-4 mb-1" /> Outflow
                        </button>
                        <button onClick={() => setFinTab('COUNTER')} className={`flex-1 relative z-10 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center transition-colors ${finTab === 'COUNTER' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                          <Calculator className="w-4 h-4 mb-1" /> Counter
                        </button>
                    </div>

                    <div className="min-h-[300px]">
                      {finTab === 'INFLOW' && (
                        <div className="space-y-6 animate-fade-in">
                          <h3 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest ml-2 flex items-center gap-1">Income Sources</h3>
                          <div className="glass-card p-6 rounded-[2.5rem] border border-green-100/50 dark:border-green-900/30 space-y-6 bg-green-50/10 dark:bg-green-900/5">
                            <NumberInput className="px-0" label="Opening Balance (Carry Forward)" value={financials.openingBalance} onChange={(v) => onFinancialChange('openingBalance', v)} prefix="Rs" />
                            <NumberInput className="px-0" label="Wasooli (Recovery)" value={financials.recoveries} onChange={(v) => onFinancialChange('recoveries', v)} prefix="Rs" />
                          </div>
                        </div>
                      )}

                      {finTab === 'OUTFLOW' && (
                        <div className="space-y-6 animate-fade-in">
                          <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest ml-2 flex items-center gap-1">Cash Deductions</h3>
                          <div className="glass-card p-6 rounded-[2.5rem] border border-red-100/50 dark:border-red-900/30 space-y-6 bg-red-50/10 dark:bg-red-900/5">
                              <NumberInput className="px-0" label="Kharcha (Expenses)" value={financials.expenses} onChange={(v) => onFinancialChange('expenses', v)} prefix="Rs" />
                              <NumberInput className="px-0" label="Udhaar (Credit Total)" value={financials.credits} onChange={(v) => onFinancialChange('credits', v)} prefix="Rs" />
                              <NumberInput className="px-0" label="Lube / Oil Sale (Separate Owner)" value={financials.lubeSales} onChange={(v) => onFinancialChange('lubeSales', v)} prefix="Rs" />
                              <NumberInput className="px-0" label="Bank Deposit" value={financials.bankDeposit} onChange={(v) => onFinancialChange('bankDeposit', v)} prefix="Rs" />
                              <NumberInput className="px-0" label="Easy Paisa / Jazz" value={financials.digitalPayments} onChange={(v) => onFinancialChange('digitalPayments', v)} prefix="Rs" />
                          </div>
                        </div>
                      )}

                      {finTab === 'COUNTER' && (
                        <div className="animate-fade-in">
                            <CashTally 
                                breakdown={financials.cashBreakdown || INITIAL_CASH_BREAKDOWN}
                                onChange={handleCashTallyChange}
                            />
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <NumberInput className="px-0" label="Manual Cash Correction" value={financials.physicalCash} onChange={(v) => onFinancialChange('physicalCash', v)} prefix="Rs" />
                            </div>
                        </div>
                      )}
                    </div>
                </div>
              );
          case Step.SUMMARY:
              return (
               <div className="space-y-6 text-center relative z-10 animate-slide-in-right">
                  <div className="py-2 transform transition-all hover:scale-105 duration-300">
                    <div className={`inline-flex p-5 rounded-[2rem] mb-4 shadow-xl ring-4 ring-white/50 dark:ring-slate-700 ${calculations.difference >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-50 text-emerald-600' : 'bg-gradient-to-br from-red-100 to-rose-50 text-rose-600'}`}>
                      {calculations.difference >= 0 ? <CheckCircle className="w-12 h-12" /> : <X className="w-12 h-12" />}
                    </div>
                    <h2 className={`text-5xl font-black tracking-tighter drop-shadow-sm ${calculations.difference >= 0 ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'}`}>
                       {calculations.difference >= 0 ? '+' : '-'} {Math.abs(calculations.difference).toLocaleString()}
                    </h2>
                    <p className={`text-xs font-extrabold uppercase tracking-widest mt-2 px-4 py-1 rounded-full inline-block ${calculations.difference >= 0 ? 'bg-emerald-100/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100/50 text-rose-700 dark:text-rose-300'}`}>
                      {calculations.difference >= 0 ? 'Excess Cash' : 'Shortage'}
                    </p>
                  </div>
                  
                  <div className="glass-card p-0 rounded-[2.5rem] text-sm shadow-xl overflow-hidden border border-white/60 dark:border-slate-700">
                     <div className="p-8 pb-6 bg-gradient-to-b from-white/40 to-white/20 dark:from-slate-800/40 dark:to-slate-900/20">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calculator className="w-3.5 h-3.5" /> Total Liability</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Fuel Sales</span><span className="font-bold text-slate-800 dark:text-white text-base">Rs {calculations.fuelRevenue.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Wasooli (Rec)</span><span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">+Rs {financials.recoveries.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Opening Bal</span><span className="font-bold text-blue-600 dark:text-blue-400 text-base">+Rs {financials.openingBalance.toLocaleString()}</span></div>
                          <div className="border-t border-slate-200/50 dark:border-slate-700 pt-3 mt-2 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-2xl shadow-inner">
                            <span className="font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Total to Account For</span>
                            <span className="font-black text-slate-900 dark:text-white text-base">Rs {calculations.totalRevenue.toLocaleString()}</span>
                          </div>
                        </div>
                     </div>
                     <div className="p-8 pt-6 bg-white/50 dark:bg-slate-800/50 border-t border-white/60 dark:border-slate-700">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowDownCircle className="w-3.5 h-3.5" /> Less: Non-Cash / Spent</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center group"><span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-rose-500 transition-colors">Kharcha (Expenses)</span><span className="font-bold text-rose-500">-Rs {financials.expenses.toLocaleString()}</span></div>
                           
                           {/* Credit Breakdown in Summary */}
                           <div className="flex flex-col group">
                             <div className="flex justify-between items-center">
                               <span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-rose-500 transition-colors">Udhaar (Credit)</span>
                               <span className="font-bold text-rose-500">-Rs {financials.credits.toLocaleString()}</span>
                             </div>
                             {financials.creditList && financials.creditList.length > 0 && (
                               <div className="mt-2 pl-4 border-l-2 border-rose-200 dark:border-rose-900/30 text-left space-y-1">
                                 {financials.creditList.map(c => (
                                   <div key={c.id} className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                     <span>{c.name}</span>
                                     <span>{c.amount}</span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>

                           <div className="flex justify-between items-center group"><span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-rose-500 transition-colors">Lube Sales (Paid Out)</span><span className="font-bold text-rose-500">-Rs {financials.lubeSales.toLocaleString()}</span></div>
                           <div className="flex justify-between items-center group"><span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-slate-700 transition-colors">Bank Deposit</span><span className="font-bold text-slate-600 dark:text-slate-300">-Rs {financials.bankDeposit.toLocaleString()}</span></div>
                           <div className="flex justify-between items-center group"><span className="text-slate-500 dark:text-slate-400 font-semibold group-hover:text-slate-700 transition-colors">EasyPaisa / Digital</span><span className="font-bold text-slate-600 dark:text-slate-300">-Rs {financials.digitalPayments.toLocaleString()}</span></div>
                        </div>
                     </div>
                     <div className="p-8 pt-6 bg-slate-900/5 dark:bg-black/20 border-t border-white/60 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-3"><span className="text-xs font-bold text-slate-500 uppercase">Target Physical Cash</span><span className="font-black text-slate-800 dark:text-white text-lg">Rs {calculations.netAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center bg-white/60 dark:bg-slate-700/60 p-4 rounded-2xl shadow-sm border border-white/50 dark:border-slate-600"><span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Actual Cash In Drawer</span><span className="font-black text-blue-600 dark:text-blue-400 text-2xl">Rs {financials.physicalCash.toLocaleString()}</span></div>
                     </div>
                  </div>

                  {/* Shift Notes Section */}
                  <div className="glass-card p-4 rounded-[2rem] border border-white/60 dark:border-slate-700 text-left">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlignLeft className="w-3.5 h-3.5" /> Shift Remarks</h3>
                     <textarea 
                       placeholder="Enter any notes about this shift (e.g. Power outage, equipment issues)..."
                       className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none h-20"
                       value={notes}
                       onChange={(e) => onNotesChange(e.target.value)}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-4 bg-white/60 dark:bg-slate-700/50 border border-white/70 dark:border-slate-600 rounded-2xl font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300"><Printer className="w-5 h-5" /> Print</button>
                     <button className="flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 hover:bg-[#20bd5a] hover:shadow-green-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"><Share2 className="w-5 h-5" /> WhatsApp</button>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/40 dark:to-blue-900/40 p-6 rounded-[2rem] border border-blue-100/50 dark:border-blue-800/30 text-left relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-bl-full group-hover:scale-110 transition-transform duration-700"></div>
                     <div className="flex justify-between items-center mb-4 relative z-10">
                       <div className="flex items-center gap-2 font-black text-xs text-slate-700 dark:text-slate-300 tracking-wide uppercase"><Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" /> AI Auditor</div>
                       {!aiReport && <button onClick={onGenerateReport} disabled={isGeneratingReport} className="text-[10px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2 rounded-full font-bold shadow-lg hover:bg-black hover:shadow-slate-900/30 transition-all duration-300 active:scale-95">{isGeneratingReport ? 'Analyzing...' : 'Analyze Shift'}</button>}
                     </div>
                     {aiReport && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-white/50 dark:border-slate-700 shadow-sm animate-fade-in">{aiReport}</p>}
                  </div>
                  <button onClick={onSave} className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-slate-900/40 hover:-translate-y-1 border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative flex items-center gap-3"><Save className="w-5 h-5" /> Close Shift</span>
                  </button>
               </div>
              );
          default: return null;
      }
  }

  return (
    <div className="max-w-xl mx-auto pb-24 pt-28 px-4">
      {/* Progress Dots */}
      <div className="mb-10 flex justify-center items-center gap-4 relative print:hidden">
         {[Step.PETROL, Step.DIESEL, Step.TESTS, Step.FINANCIALS, Step.SUMMARY].map((s) => (
           <div key={s} className={`transition-all duration-700 rounded-full ${step === s ? 'w-10 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-glow ring-2 ring-white/50' : step > s ? 'w-3 h-3 bg-blue-400' : 'w-3 h-3 bg-slate-300/50'}`}></div>
         ))}
      </div>

      <div className="glass-panel p-8 rounded-[3rem] shadow-glass-lg border border-white/60 dark:border-slate-700 animate-slide-up duration-700 print:hidden relative overflow-hidden backdrop-blur-3xl min-h-[500px] flex flex-col">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-purple-300/30 to-blue-300/30 blur-[100px] rounded-full pointer-events-none"></div>
        <div key={step} className="flex-1">
            {renderStepContent()}
        </div>
        <div className="flex justify-between mt-12 pt-8 border-t border-white/40 dark:border-slate-700 relative z-10">
           {step > Step.PETROL && step !== Step.SUMMARY && (
             <button onClick={onBack} className="p-5 rounded-2xl bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold active:scale-95 transition-all hover:bg-white/80 dark:hover:bg-slate-600 hover:shadow-md border border-white/50 dark:border-slate-600 backdrop-blur-md"><ArrowLeft className="w-6 h-6" /></button>
           )}
           {step < Step.SUMMARY && (
             <button key={step} onClick={onNext} className="ml-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center gap-3 hover:shadow-blue-500/50 hover:-translate-y-1 border border-white/20 group relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 translate-x-[-150%] animate-[shimmer_0.8s_ease-out_both]"></div>
               <span className="relative flex items-center gap-2">Next Step <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
             </button>
           )}
        </div>
        <DeveloperFooter />
      </div>
    </div>
  );
});

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.HOME);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [salesmanName, setSalesmanName] = useState("");
  const [shift, setShift] = useState<ShiftType>('DAY');
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [notes, setNotes] = useState("");

  // --- PERSISTENCE ---
  const [nozzles, setNozzles] = useState<NozzleReading[]>(() => { const s = localStorage.getItem('fuel_nozzles'); return s ? JSON.parse(s) : INITIAL_NOZZLES; });
  const [financials, setFinancials] = useState<Financials>(() => {
    const s = localStorage.getItem('fuel_financials');
    if (!s) return INITIAL_FINANCIALS;
    try { 
        const stored = JSON.parse(s); 
        // Migrate old data structure
        if (stored.bankCash && stored.physicalCash === undefined) stored.physicalCash = stored.bankCash; 
        if (!stored.cashBreakdown) stored.cashBreakdown = INITIAL_CASH_BREAKDOWN;
        if (!stored.creditList) stored.creditList = [];
        return { ...INITIAL_FINANCIALS, ...stored }; 
    } catch { return INITIAL_FINANCIALS; }
  });
  const [prices, setPrices] = useState<Prices>(() => { const s = localStorage.getItem('fuel_prices'); return s ? JSON.parse(s) : DEFAULT_PRICES; });
  const [history, setHistory] = useState<HistoryEntry[]>(() => { const s = localStorage.getItem('fuel_history'); return s ? JSON.parse(s) : []; });
  
  // New: Store the LAST closing readings to use as NEXT opening
  const [lastReadings, setLastReadings] = useState<NozzleReading[]>(() => {
    const s = localStorage.getItem('fuel_last_readings');
    // If no last readings exist (first run), default to 0.
    if (!s) return INITIAL_NOZZLES; 
    return JSON.parse(s);
  });

  const [aiReport, setAiReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Theme Toggling
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Effects
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => localStorage.setItem('fuel_nozzles', JSON.stringify(nozzles)), [nozzles]);
  useEffect(() => localStorage.setItem('fuel_financials', JSON.stringify(financials)), [financials]);
  useEffect(() => localStorage.setItem('fuel_prices', JSON.stringify(prices)), [prices]);
  useEffect(() => localStorage.setItem('fuel_history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('fuel_last_readings', JSON.stringify(lastReadings)), [lastReadings]);

  // Calculations
  const calculations = useMemo(() => {
    let pSold = 0, dSold = 0;
    nozzles.forEach(n => {
      const { sold } = calculateLitersSold(n.opening, n.closing);
      n.type === FuelType.PETROL ? pSold += sold : dSold += sold;
    });
    const netP = Math.max(0, pSold - financials.testLitersPetrol);
    const netD = Math.max(0, dSold - financials.testLitersDiesel);
    const fuelRev = (netP * prices.petrol) + (netD * prices.diesel);
    // Modified: Lube sales is NOT included in liability because it belongs to a different owner.
    const totalLiability = fuelRev + (financials.recoveries || 0) + (financials.openingBalance || 0);
    // Modified: Lube sales is treated as a deduction/payout to the separate owner.
    const deductions = (financials.expenses || 0) + (financials.credits || 0) + (financials.bankDeposit || 0) + (financials.digitalPayments || 0) + (financials.lubeSales || 0);
    const targetPhysicalCash = totalLiability - deductions;
    const totalMoneyMoved = (financials.physicalCash || 0) + (financials.bankDeposit || 0) + (financials.digitalPayments || 0);
    return { petrolSold: pSold, dieselSold: dSold, netPetrolSold: netP, netDieselSold: netD, fuelRevenue: fuelRev, totalRevenue: totalLiability, netAmount: targetPhysicalCash, totalCollected: totalMoneyMoved, difference: financials.physicalCash - targetPhysicalCash };
  }, [nozzles, financials, prices]);

  // Handlers
  const handleNozzleChange = useCallback((id: number, field: 'opening' | 'closing', value: number) => { setNozzles(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n)); }, []);
  // Updated to handle object changes (for cash breakdown and credit list)
  const handleFinancialChange = useCallback((field: keyof Financials, value: any) => { setFinancials(prev => ({ ...prev, [field]: value })); }, []);
  const handlePriceChange = useCallback((p: Prices) => setPrices(p), []);
  const handleGenerateReport = useCallback(async () => { setIsGenerating(true); const r = await generateShiftAnalysis(nozzles, financials, prices, { petrolLiters: calculations.netPetrolSold, dieselLiters: calculations.netDieselSold, revenue: calculations.totalRevenue, net: calculations.netAmount }); setAiReport(r); setIsGenerating(false); }, [nozzles, financials, prices, calculations]);
  
  // NEW: Handle Calibration Update from Settings (syncs both Last Readings and Current Active Shift)
  const handleCalibrationUpdate = useCallback((newLastReadings: NozzleReading[]) => {
    setLastReadings(newLastReadings);
    
    // Also update the currently active nozzle state if we are already in a shift (past step 0)
    // This ensures the user sees the new Opening values immediately
    setNozzles(prev => prev.map(n => {
        const calibrated = newLastReadings.find(l => l.id === n.id);
        return calibrated ? { ...n, opening: calibrated.closing } : n;
    }));
  }, []);

  const handleSave = useCallback(() => {
    const entry: HistoryEntry = { 
        id: Date.now().toString(), 
        date: new Date().toLocaleDateString(), 
        timestamp: new Date().toISOString(), 
        salesmanName: salesmanName || "Unknown", 
        shift: shift,
        totalPetrolLiters: calculations.netPetrolSold, 
        totalDieselLiters: calculations.netDieselSold, 
        totalRevenue: calculations.totalRevenue, 
        netAmount: calculations.netAmount, 
        shortageExcess: calculations.difference, 
        notes: notes,
        creditDetails: financials.creditList,
        aiAnalysis: aiReport 
    };
    setHistory(prev => [entry, ...prev]);
    
    // SAVE CLOSING AS NEXT OPENING
    const newLastReadings = nozzles.map(n => ({
        ...n,
        // The closing becomes the next opening. If closing was 0 (not entered), keep the old opening.
        closing: n.closing > 0 ? n.closing : n.opening 
    }));
    setLastReadings(newLastReadings);

    alert("Shift data saved securely. Meters updated for next shift."); 
    setNozzles(INITIAL_NOZZLES); 
    setFinancials(INITIAL_FINANCIALS); 
    setNotes("");
    setAiReport(""); 
    setCurrentStep(Step.HOME);
  }, [salesmanName, calculations, aiReport, shift, nozzles, notes, financials.creditList]);

  const handleStart = useCallback(() => { 
      if (!salesmanName.trim()) return alert("Enter Salesman ID / Name"); 
      
      // AUTO-FILL OPENING READINGS FROM LAST SAVED
      const startingNozzles = INITIAL_NOZZLES.map(n => {
          const prev = lastReadings.find(l => l.id === n.id);
          // If we have a previous reading, use its 'closing' as our 'opening'
          // The 'closing' stored in lastReadings is actually the value we want to start with.
          return { ...n, opening: prev ? prev.closing : 0 };
      });
      
      setNozzles(startingNozzles);
      setFinancials(INITIAL_FINANCIALS); 
      setNotes("");
      setAiReport(""); 
      setCurrentStep(Step.PETROL); 
  }, [salesmanName, lastReadings]);

  const greeting = useMemo(() => { const h = currentTime.getHours(); return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening"; }, [currentTime]);
  const handleFilterChange = useCallback((p: ReportPeriod) => {}, []);

  // Handler for Customer Ledger updates
  const handleCustomerLedgerChange = useCallback((customers: CreditCustomer[]) => {
      handleFinancialChange('creditList', customers);
      // NOTE: We do NOT auto-update 'credits' (total) here as requested by user.
      // They want the main input to be manual. This list is for record-keeping only.
  }, [handleFinancialChange]);

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
      <Header 
        currentTime={currentTime} 
        onHome={() => setCurrentStep(Step.HOME)} 
        onHistory={() => setShowHistory(true)} 
        onSettings={() => setShowSettings(true)} 
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        onGuide={() => setShowGuide(true)}
        onCustomers={() => setShowCustomers(true)}
      />
      
      <SettingsModal 
        show={showSettings} 
        onClose={() => setShowSettings(false)} 
        prices={prices} 
        onPriceChange={handlePriceChange} 
        lastReadings={lastReadings}
        onCalibrationUpdate={handleCalibrationUpdate}
      />
      
      <CustomerLedgerModal 
        show={showCustomers}
        onClose={() => setShowCustomers(false)}
        customers={financials.creditList || []}
        onChange={handleCustomerLedgerChange}
      />

      <HistoryModal show={showHistory} onClose={() => setShowHistory(false)} history={history} onFilterChange={handleFilterChange} />
      
      <GuideModal show={showGuide} onClose={() => setShowGuide(false)} />

      <main className="min-h-screen">
        {currentStep === Step.HOME ? (
          <HomeView 
            greeting={greeting} 
            salesmanName={salesmanName} 
            onNameChange={setSalesmanName} 
            onStart={handleStart} 
            onHistory={() => setShowHistory(true)} 
            shift={shift}
            setShift={setShift}
            prices={prices}
          />
        ) : (
          <StepWizard 
            step={currentStep} nozzles={nozzles} financials={financials} calculations={calculations} aiReport={aiReport} isGeneratingReport={isGenerating}
            onNozzleChange={handleNozzleChange} onFinancialChange={handleFinancialChange} onGenerateReport={handleGenerateReport} onSave={handleSave}
            onNext={() => setCurrentStep((p: any) => p + 1)} onBack={() => setCurrentStep((p: any) => p - 1)} 
            salesmanName={salesmanName} currentTime={currentTime} shift={shift}
            notes={notes} onNotesChange={setNotes}
          />
        )}
      </main>
    </div>
  );
};

export default App;
