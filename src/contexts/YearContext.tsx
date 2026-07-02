'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface YearContextType {
  tahun: number;
  setTahun: (tahun: number) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const [tahun, setTahun] = useState<number>(2026);

  return (
    <YearContext.Provider value={{ tahun, setTahun }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}
