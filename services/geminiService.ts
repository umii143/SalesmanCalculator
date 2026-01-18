import { GoogleGenAI } from "@google/genai";
import { DailyReport, Financials, NozzleReading, Prices } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateShiftAnalysis = async (
  readings: NozzleReading[],
  financials: Financials,
  prices: Prices,
  totals: {
    petrolLiters: number;
    dieselLiters: number;
    revenue: number;
    net: number;
  }
): Promise<string> => {
  try {
    const ai = getAIClient();
    
    const prompt = `
      You are a professional financial auditor for "Motorway Petroleum". Analyze this shift data. Currency is PKR (Rs).
      Provide a very concise, professional observation (max 80 words). Focus on efficiency and cash handling.

      Data:
      - Petrol: ${totals.petrolLiters.toFixed(2)} L @ Rs.${prices.petrol}
      - Diesel: ${totals.dieselLiters.toFixed(2)} L @ Rs.${prices.diesel}
      - Revenue: Rs.${totals.revenue.toFixed(2)}
      - Expenses: Rs.${financials.expenses}
      - Credits: Rs.${financials.credits}
      - Recoveries: Rs.${financials.recoveries}
      - Net Expected: Rs.${totals.net.toFixed(2)}
      - Cash in Drawer: Rs.${financials.physicalCash}
      - Bank Deposit: Rs.${financials.bankDeposit}
      - Digital Payments: Rs.${financials.digitalPayments}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Shift analysis complete.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Analysis currently unavailable.";
  }
};