<script>
  import { onMount } from 'svelte';
  import { scaleLinear } from 'd3-scale';

  export let podios = [];

  const COL = { 1: 'var(--p1)', 2: 'var(--p2)', 3: 'var(--p3)' };
  const rowH = 34;
  const mL = 150; // margem esquerda p/ nomes
  const mR = 46; // margem direita p/ total

  let cardW = 1100;
  let mounted = false;
  onMount(() => (mounted = true));

  $: W = Math.min(1180, Math.max(320, cardW - 52));
  $: H = podios.length * rowH + 12;
  $: max = Math.max(1, ...podios.map((d) => d.total));
  $: x = scaleLinear().domain([0, max]).range([mL, W - mR]);

  // segmentos empilhados 1.º/2.º/3.º de um barco
  function segs(d) {
    const out = [];
    let acc = 0;
    for (const p of [1, 2, 3]) {
      const v = d[p];
      if (!v) continue;
      out.push({ p, x0: x(acc), x1: x(acc + v), v });
      acc += v;
    }
    return out;
  }
</script>

<div class="chart-card" bind:clientWidth={cardW}>
  <div class="legend">
    <span><i style="background: var(--p1)"></i>1.º lugar</span>
    <span><i style="background: var(--p2)"></i>2.º lugar</span>
    <span><i style="background: var(--p3)"></i>3.º lugar</span>
  </div>

  <svg width="100%" viewBox="0 0 {W} {H}" height={H} role="img" aria-label="Barcos com mais pódios">
    {#each podios as d, i}
      <g class="r" transform="translate(0, {6 + i * rowH})">
        <text class="name" x={mL - 12} y={rowH / 2} dy=".35em" text-anchor="end">{d.name}</text>
        {#each segs(d) as s}
          <rect class="bar" x={s.x0} y="8" height={rowH - 16} width={mounted ? Math.max(0, s.x1 - s.x0) : 0} fill={COL[s.p]} />
          {#if s.x1 - s.x0 > 16}
            <text class="seg" x={(s.x0 + s.x1) / 2} y={rowH / 2} dy=".35em" text-anchor="middle">{s.v}</text>
          {/if}
        {/each}
        <text class="val" x={x(d.total) + 8} y={rowH / 2} dy=".35em">{d.total}</text>
      </g>
    {/each}
  </svg>

  <div class="chart-foot">
    Presenças no pódio (1.º–3.º) somando todas as provas e classes. Nomes de patrocinador agregados ao mesmo barco.
  </div>
</div>

<style>
  .chart-card {
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 24px 26px 16px;
    margin-top: 18px;
  }
  .legend {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
  }
  .legend i {
    width: 12px;
    height: 12px;
    display: inline-block;
  }
  .bar {
    transition: width 0.75s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  text.name {
    fill: var(--ink);
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 13px;
  }
  text.seg {
    fill: #10131c;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
  }
  text.val {
    fill: var(--muted);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
  }
  .chart-foot {
    color: var(--muted-2);
    font-size: 12px;
    margin-top: 10px;
    font-family: var(--font-mono);
  }
  @media (prefers-reduced-motion: reduce) {
    .bar {
      transition: none;
    }
  }
</style>
