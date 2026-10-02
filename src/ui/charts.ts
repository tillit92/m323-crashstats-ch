/**
 * ui/charts.ts
 *
 * Diagramme mit Chart.js für F2 (Unfälle pro Jahr), F4 (Unfälle pro Stunde)
 * und F5 (Beteiligte). Die Farben kommen aus den CSS Variablen, damit Hell- und
 * Dunkelmodus automatisch stimmen.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import {
  BarController, BarElement, CategoryScale, Chart, Legend, LinearScale,
  LineController, LineElement, PointElement, Tooltip,
  type ChartConfiguration, type ChartType,
} from "chart.js";
import type { Report } from "../types";
import { formatNumber, formatPercent } from "./format";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Legend);

/** Liest eine Farbe aus den CSS Variablen der Seite. */
const cssColor = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Aktuelle Farben gemäss DESIGN.md. */
const palette = () => ({
  ink: cssColor("--ink"),
  mute: cssColor("--mute"),
  hairline: cssColor("--hairline"),
  accent: cssColor("--accent"),
  accentDeep: cssColor("--accent-deep"),
  neutral: cssColor("--neutral-series"),
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Grundeinstellungen, die für alle Diagramme gelten. */
const applyDefaults = (): void => {
  const colors = palette();
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = colors.mute;
  Chart.defaults.borderColor = colors.hairline;
  Chart.defaults.animation = reducedMotion.matches ? false : { duration: 300 };
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.align = "start";
  Chart.defaults.plugins.tooltip.backgroundColor = colors.ink;
  Chart.defaults.plugins.tooltip.titleColor = cssColor("--canvas");
  Chart.defaults.plugins.tooltip.bodyColor = cssColor("--canvas");
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
};

const charts = new Map<string, Chart>();

/**
 * Zeichnet ein Diagramm neu oder ersetzt das bestehende auf derselben Canvas.
 * @param id     ID des Canvas Elements
 * @param config Chart.js Konfiguration
 */
const draw = <T extends ChartType>(id: string, config: ChartConfiguration<T>): void => {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  charts.get(id)?.destroy();
  charts.set(id, new Chart(canvas, config as ChartConfiguration));
};

/** F2: Gestapelte Säulen pro Jahr nach Schwere. */
const drawYears = (report: Report): void => {
  const colors = palette();
  draw("chart-years", {
    type: "bar",
    data: {
      labels: report.years.map(({ year }) => String(year)),
      datasets: [
        { label: "Leichtverletzte", data: report.years.map(({ light }) => light), backgroundColor: colors.neutral },
        { label: "Schwerverletzte", data: report.years.map(({ severe }) => severe), backgroundColor: colors.accent },
        { label: "Getötete", data: report.years.map(({ fatal }) => fatal), backgroundColor: colors.accentDeep },
      ],
    },
    options: {
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { callback: (value) => formatNumber(Number(value)) } },
      },
      plugins: {
        tooltip: { callbacks: { label: (item) => ` ${item.dataset.label}: ${formatNumber(Number(item.raw))}` } },
      },
      datasets: { bar: { borderRadius: 2, maxBarThickness: 44 } },
    },
  });
};

/** F4: Säulen pro Stunde, die Spitzenstunde im Akzent. */
const drawHours = (report: Report): void => {
  const colors = palette();
  const peak = Math.max(...report.hours);
  draw("chart-hours", {
    type: "bar",
    data: {
      labels: report.hours.map((_, hour) => `${hour}h`),
      datasets: [{
        label: "Unfälle",
        data: [...report.hours],
        backgroundColor: report.hours.map((count) => (count === peak && peak > 0 ? colors.accent : colors.neutral)),
      }],
    },
    options: {
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (value) => formatNumber(Number(value)) } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => ` ${formatNumber(Number(item.raw))} Unfälle` } },
      },
      datasets: { bar: { borderRadius: 2 } },
    },
  });
};

/** F5: Linien für den Anteil der Beteiligten pro Jahr. */
const drawParticipants = (report: Report): void => {
  const colors = palette();
  const line = (label: string, data: number[], color: string) => ({
    label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 2, tension: 0.25,
  });
  draw("chart-participants", {
    type: "line",
    data: {
      labels: report.participants.map(({ year }) => String(year)),
      datasets: [
        line("Velo", report.participants.map(({ bicyclePct }) => bicyclePct), colors.accent),
        line("Motorrad", report.participants.map(({ motorcyclePct }) => motorcyclePct), colors.ink),
        line("Fussgänger", report.participants.map(({ pedestrianPct }) => pedestrianPct), colors.neutral),
      ],
    },
    options: {
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 8 } },
        y: { beginAtZero: true, ticks: { callback: (value) => `${value} %` } },
      },
      plugins: {
        tooltip: { callbacks: { label: (item) => ` ${item.dataset.label}: ${formatPercent(Number(item.raw))}` } },
      },
    },
  });
};

/** Zeichnet alle Diagramme für einen Report. */
export const drawCharts = (report: Report): void => {
  applyDefaults();
  drawYears(report);
  drawHours(report);
  drawParticipants(report);
};
