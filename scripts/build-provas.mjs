// Passo de build do Cruzamento nome→certificado (ADR 0001).
// Lê as provas autoradas + a tabela de overrides + o índice ORC de referência,
// resolve cada Veleiro visado a um número de vela (ou "sem match") e emite
// src/generated/provas.json — a única fonte consumida pela app em runtime.
//
// Regra de match (ADR 0001): exato sobre o nome normalizado (minúsculas, sem
// acentos, sufixo de patrocinador removido); aceita qualquer país emissor; em
// empate prefere POR; restantes empates → "sem match" (pendente de curadoria).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { provas, ALIAS } from '../src/data/provas.js';
import { overrides } from '../src/data/overrides.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX_PATH = resolve(ROOT, 'LIXO/orc-data/site/index.json');
const DATA_DIR = resolve(ROOT, 'LIXO/orc-data/site/data');
const OUT_PATH = resolve(ROOT, 'src/generated/provas.json');
const OUT_BOATS_PATH = resolve(ROOT, 'src/generated/boats.json');

// remove os diacríticos (combining marks U+0300–U+036F) após decompor em NFKD
const stripAccents = (s) => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '');

// minúsculas + sem acentos + sufixo de patrocinador removido
// (corta no 1.º en-dash U+2013, em-dash U+2014, "/" ou " - ")
const norm = (s) =>
  stripAccents(s)
    .toLowerCase()
    .split(/\s*[–—/]\s*|\s+-\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (s) =>
  stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

let index;
try {
  index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
} catch (e) {
  // A fonte ORC (LIXO/) é só local e não versionada (ADR 0001). Em ambientes sem
  // ela (e.g. Vercel), se já há um provas.json gerado e commitado, saltamos a
  // regeneração e deixamos o `vite build` consumir os artefactos versionados.
  if (existsSync(OUT_PATH) && existsSync(OUT_BOATS_PATH)) {
    console.warn(
      `⚠ Índice ORC ausente em ${INDEX_PATH}\n  A usar os artefactos versionados (src/generated/*.json); salto a regeneração.`,
    );
    process.exit(0);
  }
  console.error(`\n✗ Não consegui ler o índice ORC em ${INDEX_PATH}\n  ${e.message}`);
  process.exit(1);
}

// nome normalizado → candidatos do índice
const byName = new Map();
for (const [sailnumber, name] of index) {
  const k = norm(name);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push({ sailnumber, name, country: sailnumber.split('/')[0] });
}

// Características do certificado para o Quadro de características (fatia #3):
// velocidade máxima (kn, do VPP), comprimento (m), deslocamento (kg), calado (m), GPH.
const charsCache = new Map();
const boatsOut = {}; // sailnumber → { name, type, vpp } — consumido pelo Quadro polar (fatia #6)
function boatChars(sailnumber) {
  if (charsCache.has(sailnumber)) return charsCache.get(sailnumber);
  let chars = null;
  try {
    const d = JSON.parse(readFileSync(resolve(DATA_DIR, sailnumber + '.json'), 'utf8'));
    boatsOut[sailnumber] = { name: d.name, type: d.boat?.type ?? '', vpp: d.vpp };
    const v = d.vpp || {};
    const twa = Object.keys(v).filter((k) => /^\d+$/.test(k)); // chaves de ângulo (TWA)
    const velmax = twa.length ? Math.max(...twa.map((t) => Math.max(...v[t]))) : null;
    const s = d.boat?.sizes || {};
    chars = {
      velmax: velmax != null ? +velmax.toFixed(2) : null,
      loa: s.loa ?? null,
      dspl: s.displacement ?? null,
      draft: s.draft ?? null,
      gph: d.rating?.gph ?? null,
    };
  } catch (e) {
    console.warn(`  ⚠ sem dados por-barco para ${sailnumber} (${e.code || e.message})`);
  }
  charsCache.set(sailnumber, chars);
  return chars;
}

function resolveBoat(boatName) {
  if (Object.prototype.hasOwnProperty.call(overrides, boatName)) {
    const o = overrides[boatName];
    return o ? { sailnumber: o, matched: true, via: 'override' } : { sailnumber: null, matched: false, via: 'veto' };
  }
  const cands = byName.get(norm(boatName)) || [];
  if (cands.length === 0) return { sailnumber: null, matched: false, via: 'sem-match' };
  if (cands.length === 1) return { sailnumber: cands[0].sailnumber, matched: true, via: 'auto' };
  const por = cands.filter((c) => c.country === 'POR');
  if (por.length === 1) return { sailnumber: por[0].sailnumber, matched: true, via: 'auto-por' };
  return { sailnumber: null, matched: false, via: 'ambiguo' };
}

const usedSlugs = new Map();
const outProvas = provas.map((p) => {
  let id = slugify(p.prova);
  const n = (usedSlugs.get(id) || 0) + 1;
  usedSlugs.set(id, n);
  if (n > 1) id = `${id}-${n}`;
  const classes = (p.classes || []).map((c) => ({
    name: c.name,
    classKey: c.classKey,
    rows: c.rows.map((r, i) => {
      const [name, skipper = '', club = ''] = r;
      const res = resolveBoat(name);
      const chars = res.matched ? boatChars(res.sailnumber) : null;
      return { pos: i + 1, name, skipper, club, sailnumber: res.sailnumber, matched: res.matched, via: res.via, chars };
    }),
  }));
  return { id, region: p.region, prova: p.prova, date: p.date, place: p.place, pending: !!p.pending, note: p.note || '', classes };
});

const visados = new Set();
const comRating = new Set();
for (const p of outProvas)
  for (const c of p.classes)
    for (const r of c.rows) {
      visados.add(norm(r.name));
      if (r.matched) comRating.add(r.sailnumber);
    }

// Pódios por barco (ALIAS agrega nomes de patrocinador ao mesmo barco) — gráfico (fatia #5)
const aliasName = (n) => ALIAS[n] || n;
const tally = {};
for (const p of provas)
  for (const c of p.classes || [])
    c.rows.forEach((r, i) => {
      if (i >= 3) return;
      const k = aliasName(r[0]);
      tally[k] ||= { name: k, 1: 0, 2: 0, 3: 0, total: 0 };
      tally[k][i + 1]++;
      tally[k].total++;
    });
const podios = Object.values(tally)
  .filter((d) => d.total >= 2)
  .sort((a, b) => b.total - a.total || b[1] - a[1] || a.name.localeCompare(b.name));

const out = {
  generatedAt: new Date().toISOString(),
  source: 'LIXO/orc-data/site/index.json',
  stats: { provas: outProvas.length, visadosDistintos: visados.size, comRating: comRating.size },
  provas: outProvas,
  podios,
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
writeFileSync(OUT_BOATS_PATH, JSON.stringify(boatsOut) + '\n');

console.log(
  `provas.json: ${outProvas.length} provas · ${comRating.size} veleiros com rating encontrado (de ${visados.size} visados distintos)`,
);
console.log(`boats.json: ${Object.keys(boatsOut).length} veleiros com VPP`);
console.log(`podios: ${podios.length} barcos com ≥2 pódios`);
const swing = outProvas
  .flatMap((p) => p.classes)
  .flatMap((c) => c.rows)
  .find((r) => r.name === 'Swing');
console.log(`  sanity — Swing → ${swing?.sailnumber} (${swing?.via})`);
