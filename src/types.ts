/**
 * types.ts
 *
 * Gemeinsame Datentypen und Konstanten für CrashStats CH. Beide Programmversionen
 * (V1.0 imperativ, V2.0 funktional) arbeiten mit genau diesen Typen, damit ihre
 * Resultate direkt miteinander verglichen werden können.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */

/** Unfallschwere gemäss ASTRA: as1 = Getötete, as2 = Schwerverletzte, as3 = Leichtverletzte. */
export type Severity = "as1" | "as2" | "as3";

/** Ein einzelner Unfall mit Personenschaden. */
export interface Accident {
  /** Kantonskürzel, z.B. "ZH" */
  readonly canton: string;
  readonly year: number;
  /** Monat 1 bis 12 */
  readonly month: number;
  /** Wochentag 1 (Montag) bis 7 (Sonntag) */
  readonly weekday: number;
  /** Stunde 0 bis 23 */
  readonly hour: number;
  readonly severity: Severity;
  /** Unfalltyp, z.B. "Auffahrunfall" */
  readonly type: string;
  /** Strassenart, z.B. "Autobahn" */
  readonly roadType: string;
  readonly pedestrian: boolean;
  readonly bicycle: boolean;
  readonly motorcycle: boolean;
}

/** Auswahl des Benutzers: Zeitraum und optional ein Kanton (null = ganze Schweiz). */
export interface Filter {
  readonly fromYear: number;
  readonly toYear: number;
  readonly canton: string | null;
}

/** F2: eine Zeile der Jahresübersicht. */
export interface YearRow {
  readonly year: number;
  readonly fatal: number;
  readonly severe: number;
  readonly light: number;
  readonly total: number;
  /** Veränderung zum Vorjahr in Prozent, null für das erste Jahr oder wenn das Vorjahr 0 war */
  readonly changePct: number | null;
}

/** F3 und F6: Anzahl Unfälle einer Gruppe und Anteil schwerer Unfälle (Getötete und Schwerverletzte). */
export interface GroupRow {
  readonly key: string;
  readonly total: number;
  readonly serious: number;
  readonly seriousPct: number;
}

/** F4: Anzahl Unfälle in einem Zeitfenster aus Wochentag und Stunde. */
export interface TimeSlot {
  readonly weekday: number;
  readonly hour: number;
  readonly count: number;
}

/** F5: Anteil der Unfälle mit Beteiligung von Fussgängern, Velos und Motorrädern in einem Jahr. */
export interface ParticipantRow {
  readonly year: number;
  readonly pedestrianPct: number;
  readonly bicyclePct: number;
  readonly motorcyclePct: number;
}

/** Ein Spitzenwert (z.B. unfallreichster Monat) mit seiner Anzahl. */
export interface Peak {
  readonly key: number | string;
  readonly count: number;
}

/** F7: Zusammenfassung des gewählten Zeitraums. */
export interface Summary {
  readonly total: number;
  readonly fatal: number;
  readonly topMonth: Peak | null;
  readonly topWeekday: Peak | null;
  readonly topCanton: Peak | null;
}

/** Gesamtes Resultat einer Auswertung (F2 bis F7). */
export interface Report {
  readonly summary: Summary;
  readonly years: readonly YearRow[];
  readonly cantons: readonly GroupRow[];
  readonly hours: readonly number[];
  readonly topSlots: readonly TimeSlot[];
  readonly participants: readonly ParticipantRow[];
  readonly types: readonly GroupRow[];
}

/** Schnittstelle, die V1.0 und V2.0 identisch umsetzen. */
export interface Engine {
  /**
   * F1: CSV Text in Unfälle umwandeln, ungültige Zeilen verwerfen.
   * @param csv gesamter Dateiinhalt
   * @returns alle gültigen Unfälle
   */
  parseAccidents(csv: string): readonly Accident[];
  /**
   * F1: Unfälle nach Zeitraum und Kanton filtern.
   * @param accidents alle Unfälle
   * @param filter    Zeitraum und Kanton
   * @returns die passenden Unfälle
   */
  filterAccidents(accidents: readonly Accident[], filter: Filter): readonly Accident[];
  /**
   * F2 bis F7: alle Auswertungen für die gefilterten Unfälle berechnen.
   * @param accidents bereits gefilterte Unfälle
   * @param filter    Zeitraum und Kanton
   * @returns der vollständige Report
   */
  buildReport(accidents: readonly Accident[], filter: Filter): Report;
}

/** Erwartete Spalten der Datei public/data/unfaelle_ch.csv in dieser Reihenfolge. */
export const CSV_COLUMNS = [
  "canton", "year", "month", "weekday", "hour", "severity",
  "type", "roadType", "pedestrian", "bicycle", "motorcycle",
] as const;

/** Mindestanzahl Unfälle, damit ein Unfalltyp in F6 berücksichtigt wird. */
export const MIN_TYPE_COUNT = 100;
/** Anzahl Einträge in der Rangliste der Unfalltypen (F6). */
export const TOP_TYPES = 10;
/** Anzahl Zeitfenster in F4. */
export const TOP_SLOTS = 5;
