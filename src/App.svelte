<script>
  import { onMount } from 'svelte';
  import data from './generated/provas.json';
  import Entrada from './lib/components/Entrada.svelte';
  import EcraRating from './lib/components/EcraRating.svelte';

  function parse(hash) {
    const h = (hash || '').replace(/^#/, '');
    const m = h.match(/^\/?prova\/(.+)$/);
    if (m) return { name: 'rating', id: decodeURIComponent(m[1]) };
    return { name: 'entrada' };
  }

  let route = parse(location.hash);
  onMount(() => {
    const handler = () => (route = parse(location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  $: prova = route.name === 'rating' ? data.provas.find((p) => p.id === route.id) : null;
</script>

{#if prova}
  <EcraRating {prova} />
{:else}
  <Entrada provas={data.provas} stats={data.stats} />
{/if}
