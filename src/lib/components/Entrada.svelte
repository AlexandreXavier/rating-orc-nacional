<script>
  import ProvaCard from './ProvaCard.svelte';

  export let provas = [];
  export let stats = {};

  const ORDER = { nacional: 0, centro: 1, norte: 2, madeira: 3, sul: 4 };
  $: ordered = [...provas].sort((a, b) => (ORDER[a.region] ?? 9) - (ORDER[b.region] ?? 9));
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

<main class="wrap">
  <div class="grid">
    {#each ordered as p (p.id)}
      <ProvaCard prova={p} />
    {/each}
  </div>
</main>
