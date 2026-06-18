import { writable } from 'svelte/store';

// Tópico de ajuda atualmente aberto (chave de help-content.js); null = fechado.
export const helpTopic = writable(null);

export const openHelp = (topic) => helpTopic.set(topic);
export const closeHelp = () => helpTopic.set(null);
