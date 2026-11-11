"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type MarketplaceSearchContextValue = {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
};

const MarketplaceSearchContext =
  createContext<MarketplaceSearchContextValue | null>(null);

export function MarketplaceSearchProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [value, setValue] = useState("");

  return (
    <MarketplaceSearchContext.Provider value={{ value, setValue }}>
      {children}
    </MarketplaceSearchContext.Provider>
  );
}

export function useMarketplaceSearch() {
  const context = useContext(MarketplaceSearchContext);
  if (!context) {
    throw new Error(
      "useMarketplaceSearch must be used within MarketplaceSearchProvider",
    );
  }
  return context;
}
