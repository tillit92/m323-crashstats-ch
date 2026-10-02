/**
 * ui/format.ts
 *
 * Formatierung von Zahlen und Bezeichnungen für die Anzeige (Schweizer Schreibweise).
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */

const numberFormat = new Intl.NumberFormat("de-CH");

/** Formatiert eine ganze Zahl mit Tausendertrennzeichen, z.B. 177'611. */
export const formatNumber = (value: number): string => numberFormat.format(value);

/** Formatiert einen Prozentwert mit einer Nachkommastelle, z.B. 18.2 %. */
export const formatPercent = (value: number): string => `${value.toFixed(1)} %`;

/** Formatiert eine Veränderung mit Vorzeichen, z.B. +1.3 %. */
export const formatChange = (value: number | null): string =>
  value === null ? "" : `${value > 0 ? "+" : ""}${value.toFixed(1)} %`;

export const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

export const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] as const;
export const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/** Namen der Kantone zu ihren Kürzeln. */
export const CANTONS: Readonly<Record<string, string>> = {
  AG: "Aargau", AI: "Appenzell Innerrhoden", AR: "Appenzell Ausserrhoden", BE: "Bern",
  BL: "Basel-Landschaft", BS: "Basel-Stadt", FR: "Freiburg", GE: "Genf", GL: "Glarus",
  GR: "Graubünden", JU: "Jura", LU: "Luzern", NE: "Neuenburg", NW: "Nidwalden",
  OW: "Obwalden", SG: "St. Gallen", SH: "Schaffhausen", SO: "Solothurn", SZ: "Schwyz",
  TG: "Thurgau", TI: "Tessin", UR: "Uri", VD: "Waadt", VS: "Wallis", ZG: "Zug", ZH: "Zürich",
};

/** Liefert den Namen eines Kantons oder das Kürzel, falls unbekannt. */
export const cantonName = (code: string): string => CANTONS[code] ?? code;
