// Provas de cruzeiro em Portugal (2026) — fonte autorada, transcrita do HTML de
// referência (LIXO/"Regatas de Cruzeiro · Portugal 2026 — Classificações.html").
// Cada prova: { region, prova, date, place, pending?, note?, classes:[{ name, classKey, rows }] }
// rows: [nomeDoBarco, patrão, clube]. classKey ∈ { ANC, ORC, Sport Boat, Cruzeiros }.

// Agregação de nomes de patrocinador ao mesmo barco (usado pelo gráfico de pódios, fatia #5).
export const ALIAS = {
  'Tiro – Xpand IT': 'Tiro',
  'Tiro - Xpand IT': 'Tiro',
  'Super Açor XIS – Portugal Getaways': 'Super Açor XIS',
  'Super Açor XIS – Portugal/Getaways': 'Super Açor XIS',
};

export const REGION_NAMES = {
  centro: 'Centro',
  norte: 'Norte',
  madeira: 'Madeira',
  sul: 'Sul',
  nacional: 'Nacional',
};

export const provas = [
  {
    region: 'nacional',
    prova: 'Campeonato Nacional ANC 2026 / Troféu Vela Azul',
    date: '9–10 mai',
    place: 'Almada · Mar da Palha',
    pending: true,
    note: 'Classificações finais ainda não publicadas pela ANC ~5 semanas após a prova.',
  },
  {
    region: 'madeira',
    prova: 'Campeonato Regional da Madeira de Cruzeiros',
    date: '1–3 mai',
    place: 'Funchal · CNF',
    classes: [
      {
        name: 'ORC — Geral',
        classKey: 'ORC',
        rows: [['Mono Mania', 'João Caires', 'CNF'], ['Swing', '', ''], ['Frederica Devónia', '', '']],
      },
    ],
    note: 'Mono Mania venceu também a divisão ORC-C. Último dia disputado à chuva.',
  },
  {
    region: 'sul',
    prova: '1.º Campeonato Regional do Sul de Cruzeiros',
    date: '1–3 mai',
    place: 'Praia da Rocha · Portimão',
    classes: [
      {
        name: 'ORC',
        classKey: 'ORC',
        rows: [['Magano – Polaca.pt', '', ''], ['Jáfoste', '', ''], ['Mar Meu – Navepegos', '', '']],
      },
      {
        name: 'Sport Boat',
        classKey: 'Sport Boat',
        rows: [
          ['Corkcrew – Yachting Lifestyle', '', ''],
          ['Too Much / João Marques Seguros', '', ''],
          ['Paquito', '', ''],
        ],
      },
    ],
    note: 'Estreia da prova na região · 10 barcos, +50 velejadores.',
  },
  {
    region: 'norte',
    prova: 'Regata Cidade da Póvoa',
    date: '30 mai',
    place: 'Leixões → Póvoa',
    classes: [
      {
        name: 'Cruzeiros',
        classKey: 'Cruzeiros',
        rows: [
          ['Bretoa', 'António Pires de Lima', 'CVA'],
          ['Bião II', 'Rodrigo Cunha', 'CNL'],
          ['Salpoente', 'Paulo Chavarria', 'CNP'],
        ],
      },
    ],
  },
  {
    region: 'norte',
    prova: 'Troféu Luís Ferreira Alves',
    date: '31 mai',
    place: 'Póvoa → Leixões',
    classes: [{ name: 'Cruzeiros', classKey: 'Cruzeiros', rows: [['Bretoa', 'António Pires de Lima', 'CVA']] }],
    note: 'Bretoa fechou o fim de semana com duas vitórias.',
  },
  {
    region: 'centro',
    prova: 'Torneio de Inverno ANL (após R3)',
    date: '14 mar',
    place: 'Tejo',
    classes: [
      {
        name: 'ANC — série',
        classKey: 'ANC',
        rows: [
          ['Madmax', 'Miguel Graça', 'CNC'],
          ['Harfang', 'Jaime Roque', 'ANL'],
          ['Marabunta', 'Nuno Leónidas', 'CVP'],
        ],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'Troféu Ernesto Mendonça (série)',
    date: '14–15 mar',
    place: 'Tejo e Cascais',
    classes: [
      {
        name: 'ORC — provisória',
        classKey: 'ORC',
        rows: [['Bamak', '', 'ANL'], ['Vicky II – By People to People', '', 'CNC'], ['Tiro – Xpand IT', '', 'ANL']],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'JOTUN Regata das Ostras',
    date: '28 mar',
    place: 'Tejo',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Pardal', 'João Pardal Monteiro', 'ANL'],
          ['Contrastes', 'António C. Fernandes', 'ANL'],
          ['Pede Mar', 'Rui Rijo Ferreira', 'CNA'],
        ],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'Regata dos Solitários',
    date: '18 abr',
    place: 'Tejo',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Madraço', 'João Raimundo', 'CNL'],
          ['Blu', 'Pedro Soveral Rodrigues', 'ANL'],
          ['Altitudes II', 'Jaime Roque', 'ANL'],
        ],
      },
    ],
    note: 'Regata de solitários (um só tripulante).',
  },
  {
    region: 'centro',
    prova: 'Regata Abel Power Dagge',
    date: '19 abr',
    place: 'Estuário do Tejo',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Wine Deck', 'José Sabido', 'CNL'],
          ['Madraço', 'João Raimundo', 'CNL'],
          ['Altitudes II', 'Tiago Matos', 'CNL'],
        ],
      },
    ],
  },
  {
    region: 'centro',
    prova: '82.ª Regata Wintermantel',
    date: '25 abr',
    place: 'Tejo e Sesimbra',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Anthea', 'J. Pacheco de Castro', 'ANL'],
          ['Madraço', 'João Raimundo', 'ANL'],
          ['Blu', 'Pedro Soveral Rodrigues', 'ANL'],
        ],
      },
      {
        name: 'ORC',
        classKey: 'ORC',
        rows: [
          ['Leixão', '', 'CNC'],
          ['Super Açor XIS – Portugal Getaways', '', 'CNVFC'],
          ['Paragon R', '', 'CNC'],
        ],
      },
    ],
  },
  {
    region: 'centro',
    prova: '77.ª Regata Walter Brasch',
    date: '26 abr',
    place: 'Sesimbra e Tejo',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Anthea', 'J. Pacheco de Castro', 'ANL'],
          ['Madraço', 'Miguel Graça', 'CNC'],
          ['Altitudes II', 'Jorge Queiroga', 'ANL'],
        ],
      },
      {
        name: 'ORC',
        classKey: 'ORC',
        rows: [['Leixão', '', 'CNC'], ['Eagle III', '', 'ANL'], ['Super Açor XIS – Portugal Getaways', '', 'CNVFC']],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'Troféu Aniversário ANL (170 anos)',
    date: '2–3 mai',
    place: 'Tejo e Cascais',
    classes: [
      {
        name: 'ANC — Frota A',
        classKey: 'ANC',
        rows: [
          ['Wine Deck', 'José Sabido', 'CNL'],
          ['Funbel – Nacex', 'António S. Noronha', 'ANL'],
          ['Xekmatt', 'Hugo Barrier Henrique', 'ANL'],
        ],
      },
      {
        name: 'ORC',
        classKey: 'ORC',
        rows: [['Bamak', '', 'ANL'], ['Tiro – Xpand IT', '', 'ANL'], ["Who's Next", '', 'CNC']],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'XIII Troféu Cidade de Almada',
    date: '16–17 mai',
    place: 'Mar da Palha',
    classes: [
      {
        name: 'ANC — Div. A',
        classKey: 'ANC',
        rows: [['Blu', '', 'SAD'], ['Carioca', '', 'ANL'], ['Mar de Levante', '', 'SAD']],
      },
      {
        name: 'ORC',
        classKey: 'ORC',
        rows: [['Xekmatt', '', 'ANL'], ['Tiro', '', 'ANL'], ['Super Açor XIS – Portugal/Getaways', '', 'CNVFC']],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'Regata Fernão Mendes Pinto (offshore)',
    date: '16 mai',
    place: 'Cacilhas–Caparica–Cascais',
    classes: [
      {
        name: 'ANC — trip. completa',
        classKey: 'ANC',
        rows: [['Anthea', '', 'ANL'], ['Wojtyla', '', 'CNC'], ['Altitudes II', '', 'ANL']],
      },
      {
        name: 'ANC — 2 tripulantes',
        classKey: 'ANC',
        rows: [['Wine Deck', '', 'CNL'], ['Pardal', '', 'ANL'], ['Pede Mar', '', 'ANL']],
      },
    ],
    note: 'Correu também em ORC (vencedor Wojtyla, CNC).',
  },
  {
    region: 'centro',
    prova: 'Regata dos Pilotos',
    date: '24 mai',
    place: 'Tejo',
    classes: [
      {
        name: 'ANC',
        classKey: 'ANC',
        rows: [
          ['Wine Deck', 'José Sabido', 'CNL'],
          ['Pardal', 'João Pardal Monteiro', 'ANL'],
          ['Super Açor XIS – Portugal Getaways', 'Gonçalo Vaz Botelho', 'CNVFC'],
        ],
      },
    ],
  },
  {
    region: 'centro',
    prova: 'Troféu SAD (série consolidada)',
    date: 'jan–mai',
    place: 'Lisboa · Belém',
    classes: [
      {
        name: 'Classe A',
        classKey: 'ANC',
        rows: [['Blu', '', ''], ['Senzo', '', ''], ['Harfang', '', '']],
      },
      {
        name: 'Classe B',
        classKey: 'ANC',
        rows: [['Mirage I', '', ''], ['Polaris', '', ''], ['Sherazade', '', '']],
      },
    ],
    note: 'Série da Algés e Dafundo (líderes por classe), não uma prova única.',
  },
];
