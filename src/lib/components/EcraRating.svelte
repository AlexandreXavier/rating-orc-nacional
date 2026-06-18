<script>
  import PolarPlot from './PolarPlot.svelte';
  import boatsData from '../../generated/boats.json';

  const REGION_NAMES = { centro: 'Centro', norte: 'Norte', madeira: 'Madeira', sul: 'Sul', nacional: 'Nacional' };

  export let prova;

  const COLS = [
    { key: 'velmax', label: 'V. máx', unit: 'kn', dp: 2 },
    { key: 'loa', label: 'Compr.', unit: 'm', dp: 2 },
    { key: 'dspl', label: 'Desloc.', unit: 'kg', dp: 0 },
    { key: 'draft', label: 'Calado', unit: 'm', dp: 2 },
    { key: 'gph', label: 'GPH', unit: '', dp: 1 },
  ];

  // Veleiros da prova com Rating encontrado, deduplicados por número de vela
  // (todas as classes juntas; se medalhou em vários blocos, classes combinadas).
  $: boats = (() => {
    const m = new Map();
    for (const c of prova.classes)
      for (const r of c.rows)
        if (r.matched) {
          const ex = m.get(r.sailnumber);
          if (ex) {
            if (!ex.classes.includes(c.classKey)) ex.classes.push(c.classKey);
          } else {
            m.set(r.sailnumber, { name: r.name, sailnumber: r.sailnumber, chars: r.chars || {}, classes: [c.classKey] });
          }
        }
    return [...m.values()];
  })();

  // maior/menor por coluna, sobre o conjunto (só quando há ≥2 valores)
  $: extremes = (() => {
    const ex = {};
    for (const col of COLS) {
      const vals = boats.map((b) => b.chars?.[col.key]).filter((v) => v != null);
      if (vals.length >= 2) ex[col.key] = { max: Math.max(...vals), min: Math.min(...vals) };
    }
    return ex;
  })();

  // Veleiro em foco para o Quadro polar: hover na linha, com fallback para o 1.º.
  let hoverSn;
  $: defaultSn = boats[0]?.sailnumber;
  $: activeSn = hoverSn && boats.some((b) => b.sailnumber === hoverSn) ? hoverSn : defaultSn;
  $: focused = activeSn ? boatsData[activeSn] : null;

  const fmt = (v, dp) =>
    v == null ? '—' : v.toLocaleString('pt-PT', { minimumFractionDigits: dp, maximumFractionDigits: dp });

  function mark(key, v) {
    const e = extremes[key];
    if (!e || v == null) return '';
    if (v === e.max) return 'max';
    if (v === e.min) return 'min';
    return '';
  }
</script>

<div class="wrap rating">
  <a class="back" href="#/">← Voltar às provas</a>

  <header class="rhead" data-region={prova.region}>
    <div class="rgn"><span class="fdot"></span>{REGION_NAMES[prova.region] ?? prova.region}</div>
    <h1>{prova.prova}</h1>
    <div class="meta"><span class="mono">{prova.date}</span><span>◦ {prova.place}</span></div>
  </header>

  {#if boats.length}
    <p class="lead">
      <b>{boats.length}</b> veleiro(s) com rating encontrado
      <span class="hint">· ▲ maior · ▼ menor por coluna · passa o rato numa linha para ver o polar</span>
    </p>

    <div class="rating-grid">
      <div class="chars-wrap">
        <table class="chars">
          <thead>
            <tr>
              <th class="b">Veleiro</th>
              <th class="c">Classe</th>
              {#each COLS as col}
                <th class="n">{col.label}{#if col.unit}<span class="u"> ({col.unit})</span>{/if}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each boats as b (b.sailnumber)}
              <tr class:focused={b.sailnumber === activeSn} on:mouseenter={() => (hoverSn = b.sailnumber)}>
                <td class="b"><strong>{b.name}</strong><span class="sn">{b.sailnumber}</span></td>
                <td class="c">{#each b.classes as k}<span class="cls">{k}</span>{/each}</td>
                {#each COLS as col}
                  {@const m = mark(col.key, b.chars?.[col.key])}
                  <td class="n {m}">
                    {fmt(b.chars?.[col.key], col.dp)}{#if m === 'max'}<span class="arr">▲</span>{:else if m === 'min'}<span class="arr">▼</span>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="rt-polar">
        {#if focused}
          <h4>{focused.name}<span class="ty">{focused.type}</span></h4>
          <PolarPlot boats={[focused]} />
        {/if}
      </div>
    </div>
  {:else}
    <p class="lead">Nenhum veleiro desta prova tem rating encontrado no dataset ORC.</p>
  {/if}
</div>
