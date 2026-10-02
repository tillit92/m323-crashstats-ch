/**
 * ui/render.ts
 *
 * Schreibt die Resultate eines Reports (F2, F3, F4, F6, F7) als HTML in die Seite.
 * Die Diagramme liegen in charts.ts.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import type { Filter, GroupRow, Report } from "../types";
import { cantonName, formatChange, formatNumber, formatPercent, MONTHS, WEEKDAYS, WEEKDAYS_SHORT } from "./format";

/** Ersetzt Sonderzeichen, damit Texte sicher ins HTML eingefügt werden können. */
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} fehlt`);
  return element;
};

/** F7: Kennzahlen oberhalb der Panels. */
const renderKpis = (report: Report, filter: Filter): void => {
  const { total, fatal, topMonth, topWeekday, topCanton } = report.summary;
  const period = filter.fromYear === filter.toYear ? `${filter.fromYear}` : `${filter.fromYear} bis ${filter.toYear}`;
  const kpi = (label: string, value: string, note: string, accent = false) => {
    const kind = /^[\d'’]+$/.test(value) ? "num" : "word";
    return `<dl class="kpi${accent ? " kpi-accent" : ""}"><dt>${label}</dt><dd class="${kind}">${value}<small>${note}</small></dd></dl>`;
  };

  byId("kpis").innerHTML = [
    kpi("Unfälle", formatNumber(total), period),
    kpi("mit Getöteten", formatNumber(fatal), total ? `${formatPercent((fatal * 100) / total)} aller Unfälle` : "", true),
    kpi("Spitzenmonat", topMonth ? MONTHS[Number(topMonth.key) - 1]! : "", topMonth ? `${formatNumber(topMonth.count)} Unfälle` : ""),
    kpi("Spitzentag", topWeekday ? WEEKDAYS[Number(topWeekday.key) - 1]! : "", topWeekday ? `${formatNumber(topWeekday.count)} Unfälle` : ""),
    kpi(filter.canton ? "Kanton" : "Meiste Unfälle", topCanton ? String(topCanton.key) : "", topCanton ? cantonName(String(topCanton.key)) : ""),
  ].join("");
};

/** F2: Tabelle der Jahre mit Veränderung zum Vorjahr. */
const renderYearTable = (report: Report): void => {
  const rows = report.years.map((row) => {
    const trend = row.changePct === null ? "" : row.changePct > 0 ? "up" : "down";
    return `<tr>
      <td class="num">${row.year}</td>
      <td class="num">${formatNumber(row.fatal)}</td>
      <td class="num">${formatNumber(row.severe)}</td>
      <td class="num">${formatNumber(row.light)}</td>
      <td class="num">${formatNumber(row.total)}</td>
      <td class="num ${trend}">${formatChange(row.changePct)}</td>
    </tr>`;
  });
  byId("table-years").innerHTML = `<table>
    <thead><tr><th>Jahr</th><th>Getötete</th><th>Schwerverletzte</th><th>Leichtverletzte</th><th>Total</th><th>Vorjahr</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>`;
};

/**
 * Baut eine Rangliste mit Balken, deren Länge relativ zum grössten Wert ist.
 * @param rows      Zeilen der Rangliste
 * @param barValue  bestimmt die Länge des Balkens
 * @param label     Beschriftung des Schlüssels
 * @param value     Wert rechts
 * @param selected  Schlüssel, der hervorgehoben wird
 */
const ranking = (
  rows: readonly GroupRow[],
  barValue: (row: GroupRow) => number,
  label: (row: GroupRow) => string,
  value: (row: GroupRow) => string,
  selected: string | null = null,
): string => {
  if (rows.length === 0) return `<li class="empty">Keine Unfälle in dieser Auswahl.</li>`;
  const max = Math.max(...rows.map(barValue));
  return rows.map((row, i) => `
    <li class="${row.key === selected ? "selected" : ""}">
      <span class="rank num">${i + 1}</span>
      <span class="key" title="${escapeHtml(row.key)}">${escapeHtml(label(row))}</span>
      <span class="bar${i === 0 ? " accent" : ""}" style="width:${max ? (barValue(row) / max) * 100 : 0}%"></span>
      <span class="value num">${value(row)}</span>
    </li>`).join("");
};

/** F3: Kantone nach Anzahl Unfällen. */
const renderCantons = (report: Report, filter: Filter): void => {
  byId("list-cantons").innerHTML = ranking(
    report.cantons,
    (row) => row.total,
    (row) => row.key,
    (row) => `${formatNumber(row.total)} <small>${formatPercent(row.seriousPct)}</small>`,
    filter.canton,
  );
};

/** F4: Zeitfenster mit den meisten Unfällen. */
const renderSlots = (report: Report): void => {
  byId("list-slots").innerHTML = report.topSlots.length
    ? report.topSlots
      .map((slot) => `<li>${WEEKDAYS_SHORT[slot.weekday - 1]} ${slot.hour}:00<span class="num">${formatNumber(slot.count)}</span></li>`)
      .join("")
    : `<li class="empty">Keine Unfälle in dieser Auswahl.</li>`;
};

/** F6: Unfalltypen nach Anteil schwerer Unfälle. */
const renderTypes = (report: Report): void => {
  byId("list-types").innerHTML = ranking(
    report.types,
    (row) => row.seriousPct,
    (row) => row.key,
    (row) => `${formatPercent(row.seriousPct)} <small>von ${formatNumber(row.total)}</small>`,
  );
};

/** Schreibt alle Textauswertungen eines Reports in die Seite. */
export const renderReport = (report: Report, filter: Filter): void => {
  renderKpis(report, filter);
  renderYearTable(report);
  renderCantons(report, filter);
  renderSlots(report);
  renderTypes(report);
};
