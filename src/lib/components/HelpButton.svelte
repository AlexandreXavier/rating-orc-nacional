<script>
  import { openHelp } from '../help.js';

  export let topic; // chave em help-content.js
  export let label = 'esta secção';
</script>

<button
  class="help-btn"
  type="button"
  on:click|stopPropagation|preventDefault={() => openHelp(topic)}
  aria-label="Ajuda sobre {label}"
  title="O que é isto?"
>?</button>

<style>
  .help-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    margin-left: 8px;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    vertical-align: middle;
    transition: color 0.18s, border-color 0.18s;
  }
  .help-btn:hover,
  .help-btn:focus-visible {
    color: var(--accent);
    border-color: var(--accent);
    outline: none;
  }
</style>
