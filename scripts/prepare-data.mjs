/**
 * prepare-data.mjs
 *
 * Kürzt den ASTRA Rohdatensatz (RoadTrafficAccidentLocations.csv) auf die Jahre
 * 2016 bis 2025 und die Spalten, die CrashStats CH braucht. Das Resultat wird nach
 * public/data/unfaelle_ch.csv geschrieben und von V1.0 und V2.0 gleichermassen gelesen.
 *
 * Aufruf: node scripts/prepare-data.mjs <pfad/zu/RoadTrafficAccidentLocations.csv>
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 1.0
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const FIRST_YEAR = 2016;
const LAST_YEAR = 2025;
const OUTPUT = "public/data/unfaelle_ch.csv";

/**
 * Zerlegt eine CSV Zeile mit Anführungszeichen in ihre Felder.
 * @param {string} line eine Zeile der Rohdatei
 * @returns {string[]} die Felder der Zeile
 */
function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else current += char;
  }
  fields.push(current);
  return fields;
}

const input = process.argv[2];
if (!input) {
  console.error("Bitte Pfad zur Rohdatei angeben.");
  process.exit(1);
}

const lines = createInterface({ input: createReadStream(input, "utf8") });
const out = ["canton,year,month,weekday,hour,severity,type,roadType,pedestrian,bicycle,motorcycle"];
let header = null;

for await (const rawLine of lines) {
  const fields = splitCsvLine(rawLine.replace(/^﻿/, ""));
  if (!header) {
    header = Object.fromEntries(fields.map((name, i) => [name, i]));
    continue;
  }
  const get = (name) => fields[header[name]];
  const year = Number(get("AccidentYear"));
  if (year < FIRST_YEAR || year > LAST_YEAR) continue;
  out.push([
    get("CantonCode"),
    year,
    Number(get("AccidentMonth")),
    Number(get("AccidentWeekDay").slice(-1)),
    Number(get("AccidentHour")),
    get("AccidentSeverityCategory"),
    get("AccidentType_de"),
    get("RoadType_de"),
    get("AccidentInvolvingPedestrian"),
    get("AccidentInvolvingBicycle"),
    get("AccidentInvolvingMotorcycle"),
  ].join(","));
}

writeFileSync(OUTPUT, out.join("\n") + "\n");
console.log(`${out.length - 1} Unfälle nach ${OUTPUT} geschrieben.`);
