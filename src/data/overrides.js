// Tabela de Override curado (ADR 0001) — bidirecional.
// Chave: nome do barco tal como aparece no pódio (em provas.js).
//   valor "POR/POR1234"  → força/desambigua o match para esse número de vela
//   valor null           → veta o match automático (falso homónimo)
//
// Curado na fatia #2 (revisão humana do cruzamento).
export const overrides = {
  // Recuperados — o match automático falhou por grafia/espaço; todos confirmados:
  'Mono Mania': 'POR/GBR8044R', // = MONOMANIA (J80), emitido em POR — só diferia o espaço
  'Corkcrew – Yachting Lifestyle': 'POR/POR1756', // = CORKSCREW (CORK 1720), emitido em POR — variante de grafia
  'Vicky II – By People to People': 'POR/ESP8377', // = VICKY (VROLIJK 37), emitido em POR

  // Certificado estrangeiro, confirmados na curadoria (lock do match automático):
  Bamak: 'ESP/ESP10206', // SINERGIA 40 (ES)
  'Magano – Polaca.pt': 'ESP/POL77', // Marina 36 sport (construtor polaco; nº de vela POL)

  // Desambiguação POR vs NED (lock da preferência POR):
  Swing: 'POR/POR8236', // GRAND SOLEIL 50R (não o NED/NED9063)
};
