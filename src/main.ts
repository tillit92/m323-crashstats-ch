/**
 * main.ts
 *
 * Einstiegspunkt der Website CrashStats CH. Lädt die CSV Datei, reagiert auf die
 * Auswahl (Zeitraum, Kanton, Version) und lässt die gewählte Version (V1.0 imperativ
 * oder V2.0 funktional) alle Auswertungen berechnen.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import "./styles.css";
import type { Accident, Engine, Filter } from "./types";
import { engineV1 } from "./v1/analysis";
import { engineV2 } from "./v2/analysis";
import { drawCharts } from "./ui/charts";
import { renderReport } from "./ui/render";
import { cantonName, formatNumber } from "./ui/format";

/** Pfad zur CSV Datei mit den Unfällen. */
const DATA_URL = `${import.meta.env.BASE_URL}data/unfaelle_ch.csv`;
/** Erstes auswählbares Jahr. */
const FIRST_YEAR = 2016;
/** Letztes auswählbares Jahr. */
const LAST_YEAR = 2025;

/** Kennung der Programmversion. */
type Version = "v1" | "v2";

/** Die beiden Programmversionen. */
const engines: Readonly<Record<Version, Engine>> = { v1: engineV1, v2: engineV2 };
/** Anzeigenamen der Versionen. */
const labels: Readonly<Record<Version, string>> = { v1: "V1.0 imperativ", v2: "V2.0 funktional" };

/** Elemente der Seite, die gelesen oder beschrieben werden. */
const fromSelect = document.getElementById("from-year") as HTMLSelectElement;
const toSelect = document.getElementById("to-year") as HTMLSelectElement;
const cantonSelect = document.getElementById("canton") as HTMLSelectElement;
const controls = document.getElementById("controls") as HTMLFormElement;
const page = document.getElementById("page") as HTMLElement;
const status = document.getElementById("status") as HTMLElement;

/** Rohdaten der CSV Datei, einmal geladen. */
let csvText = "";
/** Eingelesene Unfälle pro Version, damit jede Version ihr eigenes F1 ausführt. */
const parsed = new Map<Version, readonly Accident[]>();

/**
 * Füllt eine Auswahlliste mit den Jahren.
 * @param select   Auswahlliste
 * @param selected vorausgewähltes Jahr
 */
const fillYears = (select: HTMLSelectElement, selected: number): void => {
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    select.add(new Option(String(year), String(year), false, year === selected));
  }
};

/**
 * Liest die aktuelle Auswahl aus dem Formular.
 * @returns Filter (Zeitraum und Kanton) und gewählte Version
 */
const readSelection = (): { filter: Filter; version: Version } => {
  const a = Number(fromSelect.value);
  const b = Number(toSelect.value);
  const version = (new FormData(controls).get("engine") ?? "v2") as Version;
  return {
    filter: { fromYear: Math.min(a, b), toYear: Math.max(a, b), canton: cantonSelect.value || null },
    version,
  };
};

/** Berechnet den Report mit der gewählten Version und zeigt ihn an. */
const update = (): void => {
  const { filter, version } = readSelection();
  const engine = engines[version];

  if (!parsed.has(version)) parsed.set(version, engine.parseAccidents(csvText));
  const start = performance.now();
  const accidents = engine.filterAccidents(parsed.get(version)!, filter);
  const report = engine.buildReport(accidents, filter);
  const duration = performance.now() - start;

  renderReport(report, filter);
  drawCharts(report);

  const place = filter.canton ? cantonName(filter.canton) : "ganze Schweiz";
  status.textContent =
    `${formatNumber(accidents.length)} Unfälle, ${place}. Berechnet mit ${labels[version]} in ${Math.round(duration)} ms.`;
};

/**
 * Übernimmt eine Auswahl aus der Adresse, z.B. ?version=v1&von=2020&bis=2025&kanton=BS.
 * So lassen sich V1.0 und V2.0 mit derselben Auswahl direkt aufrufen.
 */
const applyUrlParams = (): void => {
  const params = new URLSearchParams(window.location.search);
  const version = params.get("version");
  if (version === "v1" || version === "v2") {
    (document.getElementById(`engine-${version}`) as HTMLInputElement).checked = true;
  }
  if (params.has("von")) fromSelect.value = params.get("von")!;
  if (params.has("bis")) toSelect.value = params.get("bis")!;
  if (params.has("kanton")) cantonSelect.value = params.get("kanton")!.toUpperCase();
};

/** Lädt die Daten und startet die Seite. */
const init = async (): Promise<void> => {
  fillYears(fromSelect, FIRST_YEAR);
  fillYears(toSelect, LAST_YEAR);

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (error) {
    status.classList.add("error");
    status.textContent = `Die Daten konnten nicht geladen werden (${String(error)}). `
      + "Bitte zuerst npm run prepare-data ausführen.";
    page.setAttribute("aria-busy", "false");
    return;
  }

  parsed.set("v2", engineV2.parseAccidents(csvText));
  const cantons = [...new Set(parsed.get("v2")!.map(({ canton }) => canton))].sort();
  cantons.forEach((code) => cantonSelect.add(new Option(`${cantonName(code)} (${code})`, code)));

  applyUrlParams();
  page.setAttribute("aria-busy", "false");
  controls.addEventListener("change", update);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", update);
  update();
};

init();
