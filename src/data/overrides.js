// Tabela de Override curado (ADR 0001) — bidirecional.
// Chave: nome do barco tal como aparece no pódio (em provas.js).
//   valor "POR/POR1234"  → força/desambigua o match para esse número de vela
//   valor null           → veta o match automático (falso homónimo)
//
// Vazia nesta fatia (#1). A curadoria é a fatia #2 (HITL).
export const overrides = {};
