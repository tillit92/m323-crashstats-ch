/**
 * v1/analysis.ts
 *
 * CrashStats CH Version 1.0: imperative Umsetzung aller Produktfunktionen (F1 bis F7).
 *
 * Bewusst ohne funktionale Sprachmittel: keine Arrow Functions, keine Higher-Order
 * Functions (map, filter, reduce, forEach, sort mit Callback), keine Spread-Operatoren.
 * Gearbeitet wird mit for-Schleifen, Zählervariablen und veränderbaren Arrays.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 1.0
 */
import {
  CSV_COLUMNS, MIN_TYPE_COUNT, TOP_SLOTS, TOP_TYPES,
  type Accident, type Engine, type Filter, type GroupRow, type ParticipantRow,
  type Peak, type Report, type Severity, type Summary, type TimeSlot, type YearRow,
} from "../types";

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen                                                    */
/* ------------------------------------------------------------------ */

/**
 * Berechnet einen Anteil in Prozent, gerundet auf eine Nachkommastelle.
 * @param part  Teilmenge
 * @param total Gesamtmenge
 * @returns Prozentwert, 0 wenn total 0 ist
 */
function percent(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((part * 1000) / total) / 10;
}

/**
 * Liest eine ganze Zahl aus einem Textfeld.
 * @param text Feldinhalt
 * @returns die Zahl oder NaN, wenn das Feld keine ganze Zahl enthält
 */
function readInteger(text: string): number {
  let value = Number(text);
  if (text === "" || !Number.isInteger(value)) {
    return NaN;
  }
  return value;
}

/**
 * Prüft, ob eine Zahl in einem Bereich liegt (Grenzen inklusive).
 * @param value Zahl
 * @param min   untere Grenze
 * @param max   obere Grenze
 */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Vergleicht zwei Texte nach Zeichencode.
 * @returns negativ, wenn a vor b kommt, positiv, wenn a nach b kommt, sonst 0
 */
function compareText(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* F1: Daten einlesen und filtern                                     */
/* ------------------------------------------------------------------ */

/**
 * Wandelt eine CSV Zeile in einen Unfall um.
 * @param line eine Zeile der Datei unfaelle_ch.csv
 * @returns den Unfall oder null, wenn die Zeile ungültig ist
 */
function parseLine(line: string): Accident | null {
  let fields = line.split(",");
  if (fields.length !== CSV_COLUMNS.length) {
    return null;
  }

  let canton = fields[0]!;
  let year = readInteger(fields[1]!);
  let month = readInteger(fields[2]!);
  let weekday = readInteger(fields[3]!);
  let hour = readInteger(fields[4]!);
  let severity = fields[5]!;
  let type = fields[6]!;
  let roadType = fields[7]!;
  let pedestrian = fields[8]!;
  let bicycle = fields[9]!;
  let motorcycle = fields[10]!;

  if (canton === "" || type === "" || roadType === "") {
    return null;
  }
  if (Number.isNaN(year) || !isInRange(month, 1, 12) || !isInRange(weekday, 1, 7) || !isInRange(hour, 0, 23)) {
    return null;
  }
  if (severity !== "as1" && severity !== "as2" && severity !== "as3") {
    return null;
  }
  if ((pedestrian !== "true" && pedestrian !== "false")
    || (bicycle !== "true" && bicycle !== "false")
    || (motorcycle !== "true" && motorcycle !== "false")) {
    return null;
  }

  return {
    canton: canton,
    year: year,
    month: month,
    weekday: weekday,
    hour: hour,
    severity: severity as Severity,
    type: type,
    roadType: roadType,
    pedestrian: pedestrian === "true",
    bicycle: bicycle === "true",
    motorcycle: motorcycle === "true",
  };
}

/**
 * F1: Wandelt den Inhalt der CSV Datei in eine Liste von Unfällen um.
 * Die Kopfzeile und ungültige Zeilen werden übersprungen.
 * @param csv gesamter Dateiinhalt
 * @returns alle gültigen Unfälle
 */
function parseAccidents(csv: string): Accident[] {
  let lines = csv.split("\n");
  let accidents: Accident[] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i]!;
    if (line.endsWith("\r")) {
      line = line.slice(0, -1);
    }
    let accident = parseLine(line);
    if (accident !== null) {
      accidents.push(accident);
    }
  }
  return accidents;
}

/**
 * F1: Behält nur die Unfälle im gewählten Zeitraum und Kanton.
 * @param accidents alle Unfälle
 * @param filter    Zeitraum und Kanton
 * @returns die passenden Unfälle
 */
function filterAccidents(accidents: readonly Accident[], filter: Filter): Accident[] {
  let result: Accident[] = [];
  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    if (accident.year < filter.fromYear || accident.year > filter.toYear) {
      continue;
    }
    if (filter.canton !== null && accident.canton !== filter.canton) {
      continue;
    }
    result.push(accident);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* F2: Jahresübersicht                                                */
/* ------------------------------------------------------------------ */

/**
 * F2: Zählt die Unfälle pro Jahr nach Schwere und berechnet die Veränderung zum Vorjahr.
 * @param accidents gefilterte Unfälle
 * @param filter    gewählter Zeitraum (jedes Jahr erscheint, auch ohne Unfälle)
 */
function buildYears(accidents: readonly Accident[], filter: Filter): YearRow[] {
  let yearCount = filter.toYear - filter.fromYear + 1;
  let fatal: number[] = [];
  let severe: number[] = [];
  let light: number[] = [];
  for (let i = 0; i < yearCount; i++) {
    fatal.push(0);
    severe.push(0);
    light.push(0);
  }

  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    let index = accident.year - filter.fromYear;
    if (accident.severity === "as1") {
      fatal[index]!++;
    } else if (accident.severity === "as2") {
      severe[index]!++;
    } else {
      light[index]!++;
    }
  }

  let rows: YearRow[] = [];
  let previousTotal = 0;
  for (let i = 0; i < yearCount; i++) {
    let total = fatal[i]! + severe[i]! + light[i]!;
    let changePct: number | null = null;
    if (i > 0 && previousTotal > 0) {
      changePct = Math.round(((total - previousTotal) * 1000) / previousTotal) / 10;
    }
    rows.push({
      year: filter.fromYear + i,
      fatal: fatal[i]!,
      severe: severe[i]!,
      light: light[i]!,
      total: total,
      changePct: changePct,
    });
    previousTotal = total;
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* F3 und F6: Gruppen mit Anteil schwerer Unfälle                     */
/* ------------------------------------------------------------------ */

/**
 * Zählt Unfälle und schwere Unfälle (as1, as2) pro Kanton oder pro Unfalltyp.
 * @param accidents gefilterte Unfälle
 * @param byCanton  true = nach Kanton gruppieren, false = nach Unfalltyp
 * @returns eine Zeile pro Gruppe, unsortiert
 */
function countGroups(accidents: readonly Accident[], byCanton: boolean): GroupRow[] {
  let keys: string[] = [];
  let totals: number[] = [];
  let serious: number[] = [];

  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    let key = byCanton ? accident.canton : accident.type;

    let index = -1;
    for (let k = 0; k < keys.length; k++) {
      if (keys[k] === key) {
        index = k;
        break;
      }
    }
    if (index === -1) {
      keys.push(key);
      totals.push(0);
      serious.push(0);
      index = keys.length - 1;
    }

    totals[index]!++;
    if (accident.severity !== "as3") {
      serious[index]!++;
    }
  }

  let rows: GroupRow[] = [];
  for (let k = 0; k < keys.length; k++) {
    rows.push({
      key: keys[k]!,
      total: totals[k]!,
      serious: serious[k]!,
      seriousPct: percent(serious[k]!, totals[k]!),
    });
  }
  return rows;
}

/**
 * F3: Kantone sortiert nach Anzahl Unfällen (absteigend), bei Gleichstand nach Kürzel.
 * Sortiert wird mit Insertion Sort.
 * @param accidents gefilterte Unfälle
 */
function buildCantons(accidents: readonly Accident[]): GroupRow[] {
  let rows = countGroups(accidents, true);
  for (let i = 1; i < rows.length; i++) {
    let current = rows[i]!;
    let j = i - 1;
    while (j >= 0) {
      let other = rows[j]!;
      let otherComesFirst = other.total > current.total
        || (other.total === current.total && compareText(other.key, current.key) <= 0);
      if (otherComesFirst) {
        break;
      }
      rows[j + 1] = other;
      j--;
    }
    rows[j + 1] = current;
  }
  return rows;
}

/**
 * F6: Unfalltypen mit mindestens MIN_TYPE_COUNT Unfällen, sortiert nach Anteil
 * schwerer Unfälle (absteigend), danach nach Anzahl und Name. Liefert die ersten TOP_TYPES.
 * @param accidents gefilterte Unfälle
 */
function buildTypes(accidents: readonly Accident[]): GroupRow[] {
  let all = countGroups(accidents, false);

  let rows: GroupRow[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i]!.total >= MIN_TYPE_COUNT) {
      rows.push(all[i]!);
    }
  }

  for (let i = 1; i < rows.length; i++) {
    let current = rows[i]!;
    let j = i - 1;
    while (j >= 0) {
      let other = rows[j]!;
      let otherComesFirst = other.seriousPct > current.seriousPct
        || (other.seriousPct === current.seriousPct && other.total > current.total)
        || (other.seriousPct === current.seriousPct && other.total === current.total
          && compareText(other.key, current.key) <= 0);
      if (otherComesFirst) {
        break;
      }
      rows[j + 1] = other;
      j--;
    }
    rows[j + 1] = current;
  }

  let top: GroupRow[] = [];
  for (let i = 0; i < rows.length && i < TOP_TYPES; i++) {
    top.push(rows[i]!);
  }
  return top;
}

/* ------------------------------------------------------------------ */
/* F4: Tageszeiten                                                    */
/* ------------------------------------------------------------------ */

/**
 * F4: Zählt die Unfälle pro Stunde (0 bis 23).
 * @param accidents gefilterte Unfälle
 * @returns Array mit 24 Werten
 */
function buildHours(accidents: readonly Accident[]): number[] {
  let hours: number[] = [];
  for (let h = 0; h < 24; h++) {
    hours.push(0);
  }
  for (let i = 0; i < accidents.length; i++) {
    hours[accidents[i]!.hour]!++;
  }
  return hours;
}

/**
 * F4: Die TOP_SLOTS Zeitfenster (Wochentag und Stunde) mit den meisten Unfällen.
 * Bei Gleichstand gewinnt der frühere Wochentag, danach die frühere Stunde.
 * @param accidents gefilterte Unfälle
 */
function buildTopSlots(accidents: readonly Accident[]): TimeSlot[] {
  // Zähler für 7 Wochentage mal 24 Stunden
  let counts: number[] = [];
  for (let i = 0; i < 7 * 24; i++) {
    counts.push(0);
  }
  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    counts[(accident.weekday - 1) * 24 + accident.hour]!++;
  }

  let top: TimeSlot[] = [];
  let used: boolean[] = [];
  for (let i = 0; i < counts.length; i++) {
    used.push(false);
  }

  // Wiederholt das grösste noch nicht gewählte Zeitfenster suchen
  for (let round = 0; round < TOP_SLOTS; round++) {
    let best = -1;
    for (let i = 0; i < counts.length; i++) {
      if (used[i] || counts[i] === 0) {
        continue;
      }
      if (best === -1 || counts[i]! > counts[best]!) {
        best = i;
      }
    }
    if (best === -1) {
      break;
    }
    used[best] = true;
    top.push({
      weekday: Math.floor(best / 24) + 1,
      hour: best % 24,
      count: counts[best]!,
    });
  }
  return top;
}

/* ------------------------------------------------------------------ */
/* F5: Verkehrsteilnehmer                                             */
/* ------------------------------------------------------------------ */

/**
 * F5: Anteil der Unfälle mit Fussgänger-, Velo- und Motorradbeteiligung pro Jahr.
 * @param accidents gefilterte Unfälle
 * @param filter    gewählter Zeitraum
 */
function buildParticipants(accidents: readonly Accident[], filter: Filter): ParticipantRow[] {
  let yearCount = filter.toYear - filter.fromYear + 1;
  let totals: number[] = [];
  let pedestrians: number[] = [];
  let bicycles: number[] = [];
  let motorcycles: number[] = [];
  for (let i = 0; i < yearCount; i++) {
    totals.push(0);
    pedestrians.push(0);
    bicycles.push(0);
    motorcycles.push(0);
  }

  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    let index = accident.year - filter.fromYear;
    totals[index]!++;
    if (accident.pedestrian) {
      pedestrians[index]!++;
    }
    if (accident.bicycle) {
      bicycles[index]!++;
    }
    if (accident.motorcycle) {
      motorcycles[index]!++;
    }
  }

  let rows: ParticipantRow[] = [];
  for (let i = 0; i < yearCount; i++) {
    rows.push({
      year: filter.fromYear + i,
      pedestrianPct: percent(pedestrians[i]!, totals[i]!),
      bicyclePct: percent(bicycles[i]!, totals[i]!),
      motorcyclePct: percent(motorcycles[i]!, totals[i]!),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* F7: Zusammenfassung                                                */
/* ------------------------------------------------------------------ */

/**
 * Sucht in einem Zähler-Array den Index mit dem grössten Wert.
 * Bei Gleichstand gewinnt der kleinere Index.
 * @param counts Zähler
 * @param offset Wert, der zum Index addiert wird (z.B. 1 für Monat 1 bis 12)
 */
function findPeak(counts: number[], offset: number): Peak | null {
  let best = -1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i]! > 0 && (best === -1 || counts[i]! > counts[best]!)) {
      best = i;
    }
  }
  if (best === -1) {
    return null;
  }
  return { key: best + offset, count: counts[best]! };
}

/**
 * F7: Total, Unfälle mit Getöteten sowie unfallreichster Monat, Wochentag und Kanton.
 * @param accidents gefilterte Unfälle
 * @param cantons   bereits berechnete und sortierte Kantone aus F3
 */
function buildSummary(accidents: readonly Accident[], cantons: GroupRow[]): Summary {
  let fatal = 0;
  let months: number[] = [];
  let weekdays: number[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(0);
  }
  for (let i = 0; i < 7; i++) {
    weekdays.push(0);
  }

  for (let i = 0; i < accidents.length; i++) {
    let accident = accidents[i]!;
    if (accident.severity === "as1") {
      fatal++;
    }
    months[accident.month - 1]!++;
    weekdays[accident.weekday - 1]!++;
  }

  let topCanton: Peak | null = null;
  if (cantons.length > 0) {
    topCanton = { key: cantons[0]!.key, count: cantons[0]!.total };
  }

  return {
    total: accidents.length,
    fatal: fatal,
    topMonth: findPeak(months, 1),
    topWeekday: findPeak(weekdays, 1),
    topCanton: topCanton,
  };
}

/**
 * F2 bis F7: Berechnet alle Auswertungen für die gefilterten Unfälle.
 * @param accidents bereits gefilterte Unfälle
 * @param filter    gewählter Zeitraum und Kanton
 */
function buildReport(accidents: readonly Accident[], filter: Filter): Report {
  let cantons = buildCantons(accidents);
  return {
    summary: buildSummary(accidents, cantons),
    years: buildYears(accidents, filter),
    cantons: cantons,
    hours: buildHours(accidents),
    topSlots: buildTopSlots(accidents),
    participants: buildParticipants(accidents, filter),
    types: buildTypes(accidents),
  };
}

/** Version 1.0 (imperativ) */
export const engineV1: Engine = {
  parseAccidents: parseAccidents,
  filterAccidents: filterAccidents,
  buildReport: buildReport,
};
