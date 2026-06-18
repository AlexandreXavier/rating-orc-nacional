// Portado de LIXO/orc-data/src/util.js — apenas o necessário para o Quadro polar.
export const DEG2RAD = Math.PI / 180;

export function vmg2sog(beat_angle, vmg) {
  return vmg / Math.cos(beat_angle * DEG2RAD);
}
