<script>
  // Alterna entre o polar 2D e 3D. `mode` é bindável pelo pai (substitui a store do orc-data).
  export let mode = '2d'; // '2d' | '3d'
</script>

<div class="polar-mode-toggle">
  <button class:active={mode === '2d'} on:click={() => (mode = '2d')}>2D</button>
  <button class:active={mode === '3d'} on:click={() => (mode = '3d')}>3D</button>
</div>

<style>
  .polar-mode-toggle {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .polar-mode-toggle button {
    padding: 4px 12px;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 13px;
    cursor: pointer;
  }
  .polar-mode-toggle button:first-child {
    border-radius: var(--r) 0 0 var(--r);
    border-right: none;
  }
  .polar-mode-toggle button:last-child {
    border-radius: 0 var(--r) var(--r) 0;
  }
  .polar-mode-toggle button.active {
    background: var(--accent);
    color: rgb(var(--fill-rgb));
    border-color: var(--accent);
  }
</style>
