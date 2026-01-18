export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL'
}

export interface NozzleReading {
  id: number;
  name: string;
  type: FuelType;
  opening: number;
  closing: number;
}

export interface CashBreakdown {
  n5000: number;
  n1000: number;
  n500: number;
  n100: number;
  n50: number;
  n20: number;
  n10: number;
  coins: number;
}

export interface CreditCustomer {
  id: string;
  name: string;
  amount: number;
  vehicleNo?: string;
}

export interface Financials {
  openingBalance: number;  // Previous Day Cash / Carry Forward
  expenses: number;        // Kharcha
  credits: number;         // Udhaar (Total)
  creditList: CreditCustomer[]; // Detailed list
  recoveries: number;      // Wasooli
  lubeSales: number;       // Lube / Oil Cash
  
  physicalCash: number;    // The actual notes/coins he has in hand
  cashBreakdown?: CashBreakdown; // Detailed note count
  
  bankDeposit: number;     // Cash he deposited or Slips
  digitalPayments: number; // Easy Paisa / Jazz Cash / Card
  
  testLitersPetrol: number;
  testLitersDiesel: number;
}

export interface Prices {
  petrol: number;
  diesel: number;
}

export type ShiftType = 'DAY' | 'NIGHT';

export interface DailyReport {
  timestamp: string;
  salesmanName: string;
  shift: ShiftType;
  totalPetrolLiters: number;
  totalDieselLiters: number;
  totalRevenue: number;
  netAmount: number;
  shortageExcess: number;
  notes?: string;
  aiAnalysis?: string;
  creditDetails?: CreditCustomer[];
}

export interface HistoryEntry extends DailyReport {
  id: string;
  date: string;
}