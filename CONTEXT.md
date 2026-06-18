# Rating ORC Nacional — domain glossary (pt-PT)

Glossário canónico da app que cruza os **pódios das regatas de cruzeiro em Portugal (2026)** com os **dados de certificado ORC** (ratings e características). App Svelte nova na raiz; o `LIXO/` é só referência (o HTML das classificações é o layout de entrada, o `orc-data` é a fonte dos dados de rating). Os termos do lado dos ratings (Calado, Deslocamento, Comprimento, Velocidade do barco, GPH, OSN, VPP, Número de vela…) são herdados do glossário de referência em `LIXO/orc-data/CONTEXT.md` e não se repetem aqui.

## Language

**Prova**:
Uma regata de cruzeiro real realizada em Portugal em 2026, com data, local, **Região** e um ou mais **Pódios** por **Classe**.
_Avoid_: Regata (no orc-data designa a *simulação* VPP — ver "Flagged ambiguities"); evento.

**Pódio**:
Os três primeiros lugares (1.º/2.º/3.º) de uma **Classe** dentro de uma **Prova**.
_Avoid_: classificação (a lista completa), ranking.

**Região**:
Agrupamento geográfico das **Provas** — Centro, Norte, Madeira, Sul, Nacional.

**Classe**:
Categoria de classificação dentro de uma **Prova** — ANC, ORC, Sport Boat, Cruzeiros.
_Avoid_: divisão, categoria (genéricos).

**Veleiro**:
Embarcação à vela. No **Quadro de entrada** é referida só pelo **nome** (e.g. "Wine Deck"); no lado dos ratings é identificada pelo **Número de vela** (e.g. `POR/POR3620`). Termo herdado de `orc-data`.
_Avoid_: barco à vela, iate.

**Quadro de entrada** (a.k.a. **quadro principal**):
Ecrã inicial com as **Provas** de Portugal e os **Veleiros** medalhados; é onde se seleciona uma **Prova**. Porte do HTML de referência.

**Ecrã de rating**:
Ecrã que abre para a **Prova** selecionada; contém o **Quadro de características** e o **Quadro polar**. Cabeçalho = nome da **Prova**.

**Quadro de características**:
Tabela comparativa dos **Veleiros** da **Prova** com **Rating encontrado** — uma linha por veleiro (todas as **Classes** da prova juntas, com coluna **Classe**), colunas por característica (velocidade máxima kn, comprimento total m, deslocamento kg, calado m, GPH); realça o maior (▲) e o menor (▼) de cada coluna sobre o conjunto. Substitui as listas top-N do orc-data, redundantes para frotas pequenas.

**Quadro polar**:
Diagrama polar (VPP) do **Veleiro** em foco (hover/clique na linha da tabela) no **Ecrã de rating**; 2D por defeito (`PolarPlot`) com alternância para 3D (`PolarPlot3D`, three.js). Reusa os componentes do orc-data, re-estilizados para xani.

### Cruzamento nome→certificado

**Veleiro visado**:
Veleiro mencionado num **Pódio** de uma **Prova** — candidato ao **Cruzamento**. Todos os medalhados são visados.
_Avoid_: barco selecionado (ambíguo com a seleção de UI).

**Cruzamento**:
Processo que liga o **nome** de um **Veleiro visado** a um certificado ORC (**Número de vela**). Passagem automática (match normalizado: minúsculas, sem acentos, sufixo de patrocinador removido; aceita qualquer país emissor; em empate prefere POR) mais **Override curado**.
_EN data-side_: match, reconciliation.

**Rating encontrado**:
Estado de um **Veleiro visado** cujo **Cruzamento** resolveu para um certificado. Só os veleiros com rating encontrado aparecem no **Quadro de características**.

**Override curado**:
Entrada manual na tabela de **Cruzamento** que força um match, desambigua (e.g. Swing → POR/POR8236) ou **veta/corrige** um match automático errado (falso homónimo estrangeiro). Bidirecional.

**provas.json**:
Saída do passo de build: as **Provas** com, por **Veleiro visado**, o **Número de vela** resolvido ou "sem match". É o que a app Svelte consome (não faz cruzamento em runtime).

## Relationships

- Uma **Prova** pertence a uma **Região** e tem um ou mais **Pódios**, um por **Classe**.
- Um **Pódio** lista até 3 **Veleiros** (1.º–3.º lugar).
- Um **Veleiro visado** *pode ou não* ter **Rating encontrado** via **Cruzamento**; só os que têm aparecem no **Ecrã de rating**.
- O **Ecrã de rating** mostra um **Quadro de características** + um **Quadro polar** para os **Veleiros** (com rating encontrado) de uma **Prova**.

## Example dialogue

> **Dev:** "No **Quadro de características** mostro todos os **Veleiros** do **Pódio**?"
> **Domain expert:** "Só os que têm rating encontrado. Um barco pode estar no **Pódio** sem certificado ORC — esse não aparece no **Ecrã de rating**."

## Flagged ambiguities

- **"Regata" / "Prova"**: em `LIXO/orc-data/CONTEXT.md` designam a **simulação** VPP (uma regata simulada entre uma frota, corrigida por TN). Nesta app designam a **Prova real**. A simulação está **fora de âmbito**, por isso não há colisão dentro desta app — mas atenção ao reutilizar código/termos do orc-data.
- **Cruzamento nome→certificado**: resolvido — ver **Cruzamento**/**Rating encontrado**/**Override curado** acima. Auto (qualquer país, prefere POR em empate) + tabela curada bidirecional, pré-calculado em build para `provas.json`.
- **"visado"**: usado aqui como "veleiro mencionado num pódio e submetido ao cruzamento". Se o sentido pretendido for outro (e.g. só os que têm rating), reabrir.
