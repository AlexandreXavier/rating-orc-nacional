# Cruzamento nome→certificado: pré-calculado em build, com tabela de overrides curada

Os pódios das **Provas** referem **Veleiros** só por **nome** (pt, com sufixos de patrocinador), enquanto os dados ORC são indexados por **Número de vela**. Decidimos resolver este cruzamento **num passo de build** (não em runtime): uma passagem automática de match exato normalizado (minúsculas, sem acentos, sufixo de patrocinador removido) que **aceita qualquer país emissor** e, em empate, **prefere POR**; complementada por uma **tabela de overrides curada e bidirecional** (força um match, desambigua, ou veta/corrige um match automático errado). A saída é um `provas.json` com o número de vela resolvido (ou "sem match") por veleiro — a app Svelte só o consome, nunca faz cruzamento em runtime.

## Considered Options

- **Match automático em runtime no browser** — rejeitado: o resultado mudaria silenciosamente se o índice ORC mudasse, e ambíguos/falhados ficariam por resolver, sem ponto de revisão humana.
- **Auto só para certificados POR** — rejeitado: perdia barcos portugueses com certificado emitido fora (e.g. Bamak→ESP, Magano→ESP/POL77). Optámos por aceitar qualquer país.
- **Tabela 100% manual** — desnecessário com ~40 barcos; a passagem automática já resolve 22.

## Consequences

- "Aceitar qualquer país" arrisca falsos positivos (homónimo espanhol/holandês de um barco português). Mitigação: a tabela de overrides é **bidirecional** e pode vetar/corrigir qualquer match automático.
- "Rating encontrado" passa a ser **determinístico e revisível**: o que aparece no **Quadro de características** é exatamente o que o `provas.json` resolveu.
- Bumps de ano / novos dados ORC exigem re-correr o build do cruzamento e rever a tabela de overrides.
