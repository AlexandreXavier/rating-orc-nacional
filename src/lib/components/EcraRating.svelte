<script>
  const REGION_NAMES = { centro: 'Centro', norte: 'Norte', madeira: 'Madeira', sul: 'Sul', nacional: 'Nacional' };

  export let prova;

  // Veleiros da prova com Rating encontrado, sem duplicados por número de vela.
  $: matched = prova.classes.flatMap((c) => c.rows.filter((r) => r.matched).map((r) => ({ ...r, classKey: c.classKey })));
  $: boats = Array.from(new Map(matched.map((b) => [b.sailnumber, b])).values());
</script>

<div class="wrap rating">
  <a class="back" href="#/">← Voltar às provas</a>

  <header class="rhead" data-region={prova.region}>
    <div class="rgn"><span class="fdot"></span>{REGION_NAMES[prova.region] ?? prova.region}</div>
    <h1>{prova.prova}</h1>
    <div class="meta"><span class="mono">{prova.date}</span><span>◦ {prova.place}</span></div>
  </header>

  {#if boats.length}
    <p class="lead"><b>{boats.length}</b> veleiro(s) com rating encontrado:</p>
    <ul class="boats">
      {#each boats as b (b.sailnumber)}
        <li>
          <span class="sn">{b.sailnumber}</span>
          <strong>{b.name}</strong>
          <span class="cls">{b.classKey}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="lead">Nenhum veleiro desta prova tem rating encontrado no dataset ORC.</p>
  {/if}

  <p class="todo">Quadro de características e Quadro polar chegam nas próximas fatias (#3, #6, #7).</p>
</div>
