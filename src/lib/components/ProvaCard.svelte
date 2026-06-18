<script>
  const REGION_NAMES = { centro: 'Centro', norte: 'Norte', madeira: 'Madeira', sul: 'Sul', nacional: 'Nacional' };

  export let prova;
  export let query = '';
  export let dim = false;

  const medalClass = (pos) => (pos <= 3 ? `p${pos}` : 'px');
  const isHit = (name) => query && name.toLowerCase().includes(query);
</script>

{#if prova.pending}
  <article class="card pending" class:dim data-region={prova.region}>
    <div class="stripe"></div>
    <div class="body">
      <div class="rgn"><span class="fdot"></span>{REGION_NAMES[prova.region] ?? prova.region}</div>
      <h3>{prova.prova}</h3>
      <div class="meta"><span class="mono">{prova.date}</span><span>◦ {prova.place}</span></div>
      <div class="pendbox">
        <span class="pulse"></span>
        <div><div class="t">Aguarda publicação</div><div class="s">{prova.note}</div></div>
      </div>
    </div>
  </article>
{:else}
  <a class="card" class:dim href="#prova/{prova.id}" data-region={prova.region}>
    <div class="stripe"></div>
    <div class="body">
      <div class="rgn"><span class="fdot"></span>{REGION_NAMES[prova.region] ?? prova.region}</div>
      <h3>{prova.prova}</h3>
      <div class="meta"><span class="mono">{prova.date}</span><span>◦ {prova.place}</span></div>

      {#each prova.classes as c}
        <div class="classblock">
          <span class="classchip">{c.name}</span>
          <table class="res">
            <tbody>
              {#each c.rows as r}
                <tr class:hit={isHit(r.name)}>
                  <td class="pos"><div class="medal {medalClass(r.pos)}">{r.pos}</div></td>
                  <td class="boat">{r.name}{#if r.skipper}<span class="skip">{r.skipper}</span>{/if}</td>
                  <td class="club">{#if r.club}<span class="club-chip">{r.club}</span>{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
      {#if prova.note}<div class="note">{prova.note}</div>{/if}
    </div>
  </a>
{/if}
