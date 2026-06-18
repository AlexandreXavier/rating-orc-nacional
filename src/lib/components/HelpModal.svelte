<script>
  import { helpTopic, closeHelp } from '../help.js';
  import { helpContent } from '../help-content.js';

  let closeBtn;
  let lastFocused = null;

  $: topic = $helpTopic;
  $: content = topic ? helpContent[topic] : null;

  // Ao abrir: guarda o foco anterior e foca o botão fechar (devolve-o ao fechar).
  $: if (content && typeof document !== 'undefined') {
    lastFocused = document.activeElement;
    Promise.resolve().then(() => closeBtn?.focus());
  }

  function close() {
    closeHelp();
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // fecha só quando o clique é no fundo escurecido, não no diálogo
  function onOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function onKeydown(e) {
    if (!content) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      // trap simples: só há um controlo (fechar)
      e.preventDefault();
      closeBtn?.focus();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if content}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="help-overlay" on:click={onOverlayClick} role="presentation">
    <div
      class="help-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      tabindex="-1"
    >
      <button class="help-close" type="button" on:click={close} aria-label="Fechar" bind:this={closeBtn}>✕</button>
      <h2 id="help-title">{content.title}</h2>
      <p>{content.body}</p>
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.55);
    display: grid;
    place-items: center;
    padding: 24px;
    animation: help-fade 0.15s ease-out;
  }
  .help-dialog {
    position: relative;
    width: 100%;
    max-width: 520px;
    background: var(--panel);
    color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: var(--r);
    padding: 28px 28px 26px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  .help-dialog h2 {
    font-family: var(--font-alt);
    font-weight: 400;
    font-size: 1.7rem;
    letter-spacing: 0.02em;
    margin: 0 0 12px;
    color: var(--ink);
  }
  .help-dialog p {
    margin: 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.6;
  }
  .help-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid var(--line-strong);
    border-radius: var(--r);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.18s, border-color 0.18s;
  }
  .help-close:hover,
  .help-close:focus-visible {
    color: var(--ink);
    border-color: var(--accent);
    outline: none;
  }
  @keyframes help-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .help-overlay {
      animation: none;
    }
  }
</style>
