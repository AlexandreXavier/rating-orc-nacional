<script>
  import { onMount } from 'svelte';

  let theme = 'dark';
  onMount(() => {
    theme = document.documentElement.getAttribute('data-theme') || 'dark';
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* localStorage indisponível — ignora */
    }
  }
</script>

<button
  class="themebtn"
  on:click={toggle}
  title="Alternar tema claro/escuro"
  aria-label="Alternar tema claro/escuro"
>
  {#if theme === 'dark'}
    <!-- lua: está escuro, clicar para claro -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  {:else}
    <!-- sol: está claro, clicar para escuro -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  {/if}
</button>

<style>
  .themebtn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 50;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: var(--panel);
    color: var(--muted);
    border: 1px solid var(--line-strong);
    border-radius: var(--r);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background 0.3s;
  }
  .themebtn:hover {
    color: var(--ink);
    border-color: var(--accent);
  }
</style>
