/**
 * v2/analysis.ts
 *
 * CrashStats CH Version 2.0: funktionale Umsetzung aller Produktfunktionen (F1 bis F7).
 *
 * Dieselbe Schnittstelle und dieselben Resultate wie Version 1.0, aber mit den
 * funktionalen Sprachmitteln von TypeScript: reine Funktionen, Arrow Functions,
 * Higher-Order Functions (filter, map, reduce, flatMap), Currying, Funktionskomposition
 * (pipe, compareBy), unveränderliche Daten (readonly, toSorted) und Destructuring.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import {
  CSV_COLUMNS, MIN_TYPE_COUNT, TOP_SLOTS, TOP_TYPES,
  type Accident, type Engine, type Filter, type GroupRow, type ParticipantRow,
  type Peak, type Report, type Severity, type Summary, type TimeSlot, type YearRow,
} from "../types";

/** Eine Bedingung für ein Element. */
type Predicate<T> = (item: T) => boolean;
/** Vergleichsfunktion für toSorted. */
type Comparator<T> = (a: T, b: T) => number;

/**
 * Verkettet Funktionen gleichen Typs von links nach rechts (Funktionskomposition).
 * @param fns Funktionen, die nacheinander angewendet werden
 * @returns eine neue Funktion, die alle Schritte ausführt
 */
const pipe = <T>(...fns: ReadonlyArray<(value: T) => T>) =>
  (value: T): T => fns.reduce((result, fn) => fn(result), value);

/**
 * Erzeugt die Zahlen von from bis to (inklusive).
 * @example range(2016, 2018) liefert [2016, 2017, 2018]
 */
const range = (from: number, to: number): readonly number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/**
 * Berechnet einen Anteil in Prozent, gerundet auf eine Nachkommastelle.
 * @returns Prozentwert, 0 wenn total 0 ist
 */
const percent = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part * 1000) / total) / 10;

/**
 * Zählt die Elemente, die eine Bedingung erfüllen (Currying: erst Bedingung, dann Liste).
 * @example countWhere(isFatal)(accidents)
 */
const countWhere = <T>(predicate: Predicate<T>) =>
  (items: readonly T[]): number => items.reduce((sum, item) => (predicate(item) ? sum + 1 : sum), 0);

/** Kombiniert mehrere Vergleiche: der erste, der keinen Gleichstand liefert, entscheidet. */
const compareBy = <T>(...comparators: ReadonlyArray<Comparator<T>>): Comparator<T> =>
  (a, b) => comparators.reduce((result, compare) => (result !== 0 ? result : compare(a, b)), 0);

/** Sortiert absteigend nach einer Zahl. */
const descending = <T>(key: (item: T) => number): Comparator<T> => (a, b) => key(b) - key(a);
/** Sortiert aufsteigend nach einer Zahl. */
const ascending = <T>(key: (item: T) => number): Comparator<T> => (a, b) => key(a) - key(b);
/** Sortiert aufsteigend nach einem Text (Zeichencode). */
const alphabetical = <T>(key: (item: T) => string): Comparator<T> => (a, b) =>
  key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;

/** Liefert eine sortierte Kopie, das Original bleibt unverändert. */
const sortWith = <T>(comparator: Comparator<T>) => (items: readonly T[]): readonly T[] =>
  items.toSorted(comparator);
/** Behält nur die Elemente, die eine Bedingung erfüllen. */
const keep = <T>(predicate: Predicate<T>) => (items: readonly T[]): readonly T[] => items.filter(predicate);
/** Nimmt die ersten n Elemente. */
const take = (n: number) => <T>(items: readonly T[]): readonly T[] => items.slice(0, n);

const hasSeverity = (severity: Severity): Predicate<Accident> => (accident) => accident.severity === severity;
const isFatal = hasSeverity("as1");
const isSevere = hasSeverity("as2");
const isLight = hasSeverity("as3");
/** Schwer = Getötete oder Schwerverletzte */
const isSerious: Predicate<Accident> = (accident) => !isLight(accident);
const inYears = (from: number, to: number): Predicate<Accident> => ({ year }) => year >= from && year <= to;
const inCanton = (canton: string | null): Predicate<Accident> => (accident) =>
  canton === null || accident.canton === canton;

const isInteger = (text: string): boolean => text !== "" && Number.isInteger(Number(text));
const isIntegerBetween = (min: number, max: number) => (text: string): boolean =>
  isInteger(text) && Number(text) >= min && Number(text) <= max;
const isBoolean = (text: string): boolean => text === "true" || text === "false";
const isSeverity = (text: string): text is Severity => text === "as1" || text === "as2" || text === "as3";

/**
 * Wandelt eine CSV Zeile in einen Unfall um.
 * @returns eine Liste mit dem Unfall oder eine leere Liste, wenn die Zeile ungültig ist
 *          (so kann das Resultat direkt mit flatMap verwendet werden)
 */
const parseLine = (line: string): readonly Accident[] => {
  const fields = line.split(",");
  if (fields.length !== CSV_COLUMNS.length) return [];

  const [canton, year, month, weekday, hour, severity, type, roadType, pedestrian, bicycle, motorcycle] =
    fields as [string, string, string, string, string, string, string, string, string, string, string];

  const checks: readonly boolean[] = [
    [canton, type, roadType].every((text) => text !== ""),
    isInteger(year),
    isIntegerBetween(1, 12)(month),
    isIntegerBetween(1, 7)(weekday),
    isIntegerBetween(0, 23)(hour),
    isSeverity(severity),
    [pedestrian, bicycle, motorcycle].every(isBoolean),
  ];
  if (!checks.every(Boolean)) return [];

  return [{
    canton,
    year: Number(year),
    month: Number(month),
    weekday: Number(weekday),
    hour: Number(hour),
    severity: severity as Severity,
    type,
    roadType,
    pedestrian: pedestrian === "true",
    bicycle: bicycle === "true",
    motorcycle: motorcycle === "true",
  }];
};

/**
 * F1: Wandelt den Inhalt der CSV Datei in eine Liste von Unfällen um.
 * Die Kopfzeile und ungültige Zeilen werden übersprungen.
 */
const parseAccidents = (csv: string): readonly Accident[] =>
  csv
    .split("\n")
    .slice(1)
    .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line))
    .flatMap(parseLine);

/** F1: Behält nur die Unfälle im gewählten Zeitraum und Kanton. */
const filterAccidents = (accidents: readonly Accident[], { fromYear, toYear, canton }: Filter): readonly Accident[] =>
  accidents.filter(inYears(fromYear, toYear)).filter(inCanton(canton));

/** Veränderung in Prozent zum Vorjahr, null wenn es kein (oder ein leeres) Vorjahr gibt. */
const changeTo = (previous: number | undefined, current: number): number | null =>
  previous === undefined || previous === 0 ? null : Math.round(((current - previous) * 1000) / previous) / 10;

/** F2: Unfälle pro Jahr nach Schwere mit Veränderung zum Vorjahr. */
const buildYears = (accidents: readonly Accident[], { fromYear, toYear }: Filter): readonly YearRow[] => {
  const byYear = Map.groupBy(accidents, ({ year }) => year);
  const counts = range(fromYear, toYear).map((year) => {
    const ofYear = byYear.get(year) ?? [];
    return {
      year,
      fatal: countWhere(isFatal)(ofYear),
      severe: countWhere(isSevere)(ofYear),
      light: countWhere(isLight)(ofYear),
      total: ofYear.length,
    };
  });
  return counts.map((row, i) => ({ ...row, changePct: changeTo(counts[i - 1]?.total, row.total) }));
};

/** Gruppiert Unfälle nach einem Schlüssel und zählt total und schwere Unfälle pro Gruppe. */
const groupRows = (keyOf: (accident: Accident) => string) => (accidents: readonly Accident[]): readonly GroupRow[] =>
  Object.entries(Object.groupBy(accidents, keyOf)).map(([key, group = []]) => {
    const serious = countWhere(isSerious)(group);
    return { key, total: group.length, serious, seriousPct: percent(serious, group.length) };
  });

/** F3: Kantone nach Anzahl Unfällen, bei Gleichstand nach Kürzel. */
const buildCantons = (accidents: readonly Accident[]): readonly GroupRow[] =>
  sortWith(compareBy<GroupRow>(descending((row) => row.total), alphabetical((row) => row.key)))(
    groupRows(({ canton }) => canton)(accidents),
  );

/** F6: Top Unfalltypen nach Anteil schwerer Unfälle (nur Typen mit genug Unfällen). */
const buildTypes = (accidents: readonly Accident[]): readonly GroupRow[] =>
  pipe<readonly GroupRow[]>(
    keep((row) => row.total >= MIN_TYPE_COUNT),
    sortWith(compareBy(
      descending((row) => row.seriousPct),
      descending((row) => row.total),
      alphabetical((row) => row.key),
    )),
    take(TOP_TYPES),
  )(groupRows(({ type }) => type)(accidents));

/** F4: Anzahl Unfälle pro Stunde 0 bis 23. */
const buildHours = (accidents: readonly Accident[]): readonly number[] =>
  accidents.reduce<readonly number[]>(
    (hours, { hour }) => hours.with(hour, hours[hour]! + 1),
    range(0, 23).map(() => 0),
  );

/** F4: Die Zeitfenster aus Wochentag und Stunde mit den meisten Unfällen. */
const buildTopSlots = (accidents: readonly Accident[]): readonly TimeSlot[] => {
  const bySlot = Map.groupBy(accidents, ({ weekday, hour }) => (weekday - 1) * 24 + hour);
  return pipe<readonly TimeSlot[]>(
    sortWith(compareBy(
      descending((slot) => slot.count),
      ascending((slot) => slot.weekday),
      ascending((slot) => slot.hour),
    )),
    take(TOP_SLOTS),
  )([...bySlot].map(([slot, group]) => ({ weekday: Math.floor(slot / 24) + 1, hour: slot % 24, count: group.length })));
};

/** F5: Anteil der Unfälle mit Fussgängern, Velos und Motorrädern pro Jahr. */
const buildParticipants = (accidents: readonly Accident[], { fromYear, toYear }: Filter): readonly ParticipantRow[] => {
  const byYear = Map.groupBy(accidents, ({ year }) => year);
  const share = (predicate: Predicate<Accident>) => (group: readonly Accident[]) =>
    percent(countWhere(predicate)(group), group.length);

  return range(fromYear, toYear).map((year) => {
    const ofYear = byYear.get(year) ?? [];
    return {
      year,
      pedestrianPct: share(({ pedestrian }) => pedestrian)(ofYear),
      bicyclePct: share(({ bicycle }) => bicycle)(ofYear),
      motorcyclePct: share(({ motorcycle }) => motorcycle)(ofYear),
    };
  });
};

/**
 * Sucht unter den möglichen Schlüsseln den mit den meisten Unfällen.
 * Bei Gleichstand gewinnt der zuerst genannte Schlüssel.
 */
const findPeak = (keys: readonly number[], keyOf: (accident: Accident) => number) =>
  (accidents: readonly Accident[]): Peak | null => {
    const counts = Map.groupBy(accidents, keyOf);
    return keys
      .map((key) => ({ key, count: counts.get(key)?.length ?? 0 }))
      .filter(({ count }) => count > 0)
      .reduce<Peak | null>((best, peak) => (best === null || peak.count > best.count ? peak : best), null);
  };

/** F7: Total, Unfälle mit Getöteten sowie unfallreichster Monat, Wochentag und Kanton. */
const buildSummary = (accidents: readonly Accident[], cantons: readonly GroupRow[]): Summary => ({
  total: accidents.length,
  fatal: countWhere(isFatal)(accidents),
  topMonth: findPeak(range(1, 12), ({ month }) => month)(accidents),
  topWeekday: findPeak(range(1, 7), ({ weekday }) => weekday)(accidents),
  topCanton: cantons[0] ? { key: cantons[0].key, count: cantons[0].total } : null,
});

/** F2 bis F7: Berechnet alle Auswertungen für die gefilterten Unfälle. */
const buildReport = (accidents: readonly Accident[], filter: Filter): Report => {
  const cantons = buildCantons(accidents);
  return {
    summary: buildSummary(accidents, cantons),
    years: buildYears(accidents, filter),
    cantons,
    hours: buildHours(accidents),
    topSlots: buildTopSlots(accidents),
    participants: buildParticipants(accidents, filter),
    types: buildTypes(accidents),
  };
};

/** Version 2.0 (funktional) */
export const engineV2: Engine = { parseAccidents, filterAccidents, buildReport };
