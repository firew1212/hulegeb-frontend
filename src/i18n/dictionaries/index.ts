import type { Locale } from "../config";
import { en } from "./en";
import { am } from "./am";
import type { Dictionary } from "./en";

export const dictionaries: Record<Locale, Dictionary> = { en, am };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export type { Dictionary };
