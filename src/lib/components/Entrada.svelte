<script>
  import ProvaCard from './ProvaCard.svelte';

  export let provas = [];
  export let stats = {};

  const REGION_NAMES = { centro: 'Centro', norte: 'Norte', madeira: 'Madeira', sul: 'Sul', nacional: 'Nacional' };
  const ORDER = { nacional: 0, centro: 1, norte: 2, madeira: 3, sul: 4 };
  const REGIONS = [
    ['all', 'Todas'],
    ['centro', 'Centro'],
    ['norte', 'Norte'],
    ['madeira', 'Madeira'],
    ['sul', 'Sul'],
    ['nacional', 'Nacional'],
  ];
  const CLASSES = ['ANC', 'ORC', 'Sport Boat', 'Cruzeiros'];

  let activeRegion = 'all';
  let cls = 'all';
  let q = '';
  $: query = q.trim().toLowerCase();

  $: ordered = [...provas].sort((a, b) => (ORDER[a.region] ?? 9) - (ORDER[b.region] ?? 9));

  const classKeysOf = (p) => [...new Set((p.classes || []).map((c) => c.classKey))];
  const boatsOf = (p) => (p.classes || []).flatMap((c) => c.rows.map((r) => r.name.toLowerCase()));

  // Replica a filtragem do HTML de referência: região + classe escondem; pesquisa esbate (dim) quem não bate.
  $: rows = ordered.map((p) => {
    const regionOK = activeRegion === 'all' || p.region === activeRegion;
    const classOK = cls === 'all' || classKeysOf(p).includes(cls);
    const matchOK = !query || boatsOf(p).some((b) => b.includes(query));
    return { p, visible: regionOK && classOK, dim: !!query && regionOK && classOK && !matchOK };
  });
  $: visible = rows.filter((r) => r.visible);
  $: shown = visible.length;
  $: hits = query ? visible.filter((r) => !r.dim).length : 0;
</script>

<header class="hero">
  <div class="wrap">
    <div class="kicker"><span class="rule"></span>Vela de Cruzeiro · Época 2026</div>
    <h1>Rating ORC Nacional</h1>
    <p class="subhead">Pódios <span class="ac">× ratings</span> — Portugal</p>
    <p class="lede">
      Seleciona uma prova para ver, dos barcos medalhados, os que têm certificado ORC e as suas características.
    </p>
    <div class="statline">
      <span class="tag"><b>{stats.provas ?? ordered.length}</b>&nbsp;provas</span>
      <span class="tag"><b>{stats.comRating ?? '—'}</b>&nbsp;veleiros com rating</span>
      <span class="tag"><b>{stats.visadosDistintos ?? '—'}</b>&nbsp;barcos visados</span>
    </div>
  </div>
</header>

<div class="controls">
  <div class="wrap">
    <div class="controls-inner">
      <div class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Pesquisar barco (ex.: Bretoa, Tiro, Mono Mania)…" bind:value={q} autocomplete="off" />
      </div>
      <div class="chips">
        {#each REGIONS as [key, label]}
          <button class="chip" class:active={activeRegion === key} data-region={key} on:click={() => (activeRegion = key)}>
            <span class="fdot"></span>{label}
          </button>
        {/each}
      </div>
      <select class="classsel" bind:value={cls}>
        <option value="all">Todas as classes</option>
        {#each CLASSES as c}<option value={c}>{c}</option>{/each}
      </select>
    </div>
    <div class="count">
      {#if query}
        <b>{hits}</b> prova(s) com "<b>{q.trim()}</b>"{#if activeRegion !== 'all'} em {REGION_NAMES[activeRegion]}{/if}
      {:else}
        {shown} prova(s){#if activeRegion !== 'all'} em {REGION_NAMES[activeRegion]}{:else} no total{/if}{#if cls !== 'all'} · classe {cls}{/if}
      {/if}
    </div>
  </div>
</div>

<main class="wrap">
  <div class="grid">
    {#each visible as r (r.p.id)}
      <ProvaCard prova={r.p} {query} dim={r.dim} />
    {/each}
  </div>
</main>
