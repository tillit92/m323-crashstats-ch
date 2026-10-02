/**
 * compare.test.ts
 *
 * Prüft, dass Version 1.0 (imperativ) und Version 2.0 (funktional) mit denselben
 * Daten exakt dieselben Resultate liefern, und testet einige Eigenschaften der Auswertung.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Filter } from "../src/types";
import { engineV1 } from "../src/v1/analysis";
import { engineV2 } from "../src/v2/analysis";

const csv = readFileSync(new URL("../public/data/unfaelle_ch.csv", import.meta.url), "utf8");
const accidentsV1 = engineV1.parseAccidents(csv);
const accidentsV2 = engineV2.parseAccidents(csv);

/** Filter, mit denen beide Versionen verglichen werden. */
const filters: Filter[] = [
  { fromYear: 2016, toYear: 2025, canton: null },
  { fromYear: 2020, toYear: 2025, canton: "BS" },
  { fromYear: 2016, toYear: 2019, canton: "ZH" },
  { fromYear: 2023, toYear: 2023, canton: "AI" },
  { fromYear: 2018, toYear: 2022, canton: "GE" },
];

describe("F1 Daten einlesen", () => {
  it("V1 und V2 lesen dieselben Unfälle ein", () => {
    expect(accidentsV1.length).toBe(177_611);
    expect(accidentsV2).toEqual(accidentsV1);
  });

  it("verwirft ungültige Zeilen", () => {
    const sample = [
      "canton,year,month,weekday,hour,severity,type,roadType,pedestrian,bicycle,motorcycle",
      "BS,2024,3,5,17,as3,Auffahrunfall,Hauptstrasse,false,true,false",
      "BS,2024,13,5,17,as3,Auffahrunfall,Hauptstrasse,false,true,false", // Monat 13
      "BS,2024,3,5,24,as3,Auffahrunfall,Hauptstrasse,false,true,false", // Stunde 24
      "BS,2024,3,5,17,as9,Auffahrunfall,Hauptstrasse,false,true,false", // Schwere
      "BS,2024,3,5,17,as3,Auffahrunfall,Hauptstrasse,nein,true,false", // kein Boolean
      ",2024,3,5,17,as3,Auffahrunfall,Hauptstrasse,false,true,false", // kein Kanton
      "BS,2024,3",                                                      // zu wenige Felder
      "",
    ].join("\n");
    expect(engineV1.parseAccidents(sample)).toHaveLength(1);
    expect(engineV2.parseAccidents(sample)).toEqual(engineV1.parseAccidents(sample));
  });
});

describe.each(filters)("V1 und V2 mit Filter %o", (filter) => {
  const filteredV1 = engineV1.filterAccidents(accidentsV1, filter);
  const filteredV2 = engineV2.filterAccidents(accidentsV2, filter);
  const reportV1 = engineV1.buildReport(filteredV1, filter);
  const reportV2 = engineV2.buildReport(filteredV2, filter);

  it("filtern dieselben Unfälle", () => {
    expect(filteredV2).toEqual(filteredV1);
  });

  it("liefern denselben Report", () => {
    expect(reportV2).toEqual(reportV1);
  });

  it("Jahresübersicht ergibt das Total", () => {
    const sum = reportV1.years.reduce((total, row) => total + row.total, 0);
    expect(sum).toBe(reportV1.summary.total);
    expect(reportV1.hours.reduce((a, b) => a + b, 0)).toBe(reportV1.summary.total);
  });
});

describe("Ganze Schweiz 2016 bis 2025", () => {
  const filter: Filter = { fromYear: 2016, toYear: 2025, canton: null };
  const report = engineV2.buildReport(engineV2.filterAccidents(accidentsV2, filter), filter);

  it("enthält alle 26 Kantone", () => {
    expect(report.cantons).toHaveLength(26);
    expect(report.summary.topCanton?.key).toBe("ZH");
  });

  it("hat die meisten Unfälle um 17 Uhr", () => {
    expect(report.hours.indexOf(Math.max(...report.hours))).toBe(17);
  });

  it("liefert höchstens 10 Unfalltypen mit mind. 100 Unfällen", () => {
    expect(report.types.length).toBeLessThanOrEqual(10);
    expect(report.types.every((row) => row.total >= 100)).toBe(true);
  });
});
