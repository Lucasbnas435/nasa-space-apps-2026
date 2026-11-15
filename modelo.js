// Field Shift - modelo de comparação de rotações. Funções puras: navegador e node.
// Código escrito com assistência de IA (Claude Code, Anthropic), sob direção e revisão da equipe.
// Linha do tempo: 24 meses, índice 0 = julho do ano 1. Uma "faixa" (canteiro, talhão ou entrelinha)
// recebe uma sequência de culturas. Cultura perene ocupa os 24 meses e a faixa passa a ser a entrelinha dela.

const DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Idioma dos textos que o modelo produz: 'en' (padrão) ou 'pt'.
let LANG = 'en';
const setLang = l => { LANG = l === 'pt' ? 'pt' : 'en'; };
const L = (pt, en) => (LANG === 'en' ? en : pt);
const MESES_T = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const M = () => MESES_T[LANG];
const mesCal = i => (6 + i) % 12;
const rotulo = i => `${M()[mesCal(i)]}/${L('ano', 'year')} ${i < 6 ? 1 : i < 18 ? 2 : 3}`;

const LIMITE_GEADA = 3;    // °C de mínima absoluta do mês abaixo da qual há risco de geada
const CHUVA_FORTE = 200;   // mm no mês acima do qual folhosa em campo aberto pede atenção
const MES_SECO = 50;       // mm no mês abaixo do qual planta na entrelinha disputa água com a perene
const AGUA_MES = 120;      // ponytail: referência única de 4 mm/dia para toda cultura; trocar por Kc da FAO-56 por cultura quando o agrônomo revisar
const GRADIENTE = 0.65;    // °C a cada 100 m de altitude (gradiente térmico padrão)

const PERFIS = {
  hortalicas: { nome: 'Hortaliças', faixa: 'canteiro', en: 'Vegetables', faixaEn: 'bed' },
  anuais: { nome: 'Lavouras anuais (grãos, batata)', faixa: 'talhão', en: 'Annual crops (grains, potato)', faixaEn: 'field' },
  perenes: { nome: 'Culturas perenes (café, banana)', faixa: 'entrelinha', en: 'Perennial crops (coffee, banana)', faixaEn: 'inter-row' },
};
const perfilNome = id => L(PERFIS[id].nome, PERFIS[id].en), faixaNome = id => L(PERFIS[id].faixa, PERFIS[id].faixaEn);

// ponytail: tabela escrita de memória, PENDENTE de revisão do agrônomo. Trocar aqui, só aqui.
// p = perfil; ciclo = meses na faixa; tmin/tmax = faixa de temperatura média mensal em que a cultura vai bem (°C);
// g = sensível a geada; ch = sensível a chuva forte em campo aberto; estufa = cultivo protegido;
// perene = fica os 24 meses; entre = pode ser plantada na entrelinha de perene; cobertura = não é colhida.
const c = (nome, p, familia, ciclo, tmin, tmax, o = {}) => ({ nome, p, familia, ciclo, tmin, tmax, g: false, ch: false, estufa: false, cobertura: false, perene: false, entre: false, ...o });
const CULTURAS = {
  alface:     c('Alface (americana, romana, mini)', 'hortalicas', 'asterácea', 2, 12, 22, { ch: true }),
  salanova:   c('Alface Salanova (estufa)', 'hortalicas', 'asterácea', 2, 12, 24, { estufa: true }),
  radicchio:  c('Radicchio', 'hortalicas', 'asterácea', 3, 10, 20, { ch: true }),
  chicoria:   c('Chicória frisée', 'hortalicas', 'asterácea', 3, 12, 22, { ch: true }),
  rucula:     c('Rúcula', 'hortalicas', 'brássica', 2, 12, 24, { ch: true }),
  agriao:     c('Agrião', 'hortalicas', 'brássica', 2, 10, 20, { ch: true }),
  brocolis:   c('Brócolis ninja', 'hortalicas', 'brássica', 3, 12, 22),
  couveflor:  c('Couve-flor', 'hortalicas', 'brássica', 4, 12, 20),
  repolho:    c('Repolho', 'hortalicas', 'brássica', 4, 12, 24),
  acelga:     c('Acelga', 'hortalicas', 'brássica', 3, 12, 22, { ch: true }),
  couve:      c('Couve manteiga', 'hortalicas', 'brássica', 6, 12, 24),
  rabanete:   c('Rabanete', 'hortalicas', 'brássica', 1, 10, 22),
  espinafre:  c('Espinafre', 'hortalicas', 'amarantácea', 2, 8, 20, { ch: true }),
  beterraba:  c('Beterraba', 'hortalicas', 'amarantácea', 3, 10, 22),
  cenoura:    c('Cenoura', 'hortalicas', 'apiácea', 4, 12, 24),
  salsinha:   c('Salsinha', 'hortalicas', 'apiácea', 4, 10, 24),
  cebolinha:  c('Cebolinha', 'hortalicas', 'aliácea', 3, 10, 24),
  cebola:     c('Cebola roxa', 'hortalicas', 'aliácea', 5, 12, 24),
  tomate:     c('Tomate grape (estufa)', 'hortalicas', 'solanácea', 6, 16, 26, { g: true, estufa: true }),
  pimentao:   c('Pimentão', 'hortalicas', 'solanácea', 6, 18, 28, { g: true }),
  abobora:    c('Abóbora cabotiá', 'hortalicas', 'cucurbitácea', 4, 18, 28, { g: true }),
  abobrinha:  c('Abobrinha italiana', 'hortalicas', 'cucurbitácea', 3, 18, 28, { g: true }),
  pepino:     c('Pepino', 'hortalicas', 'cucurbitácea', 3, 18, 28, { g: true }),
  vagem:      c('Vagem', 'hortalicas', 'leguminosa', 3, 16, 26, { g: true }),

  milho:      c('Milho', 'anuais', 'gramínea', 5, 18, 30, { g: true }),
  soja:       c('Soja', 'anuais', 'leguminosa', 4, 20, 30, { g: true }),
  feijao:     c('Feijão', 'anuais', 'leguminosa', 3, 16, 26, { g: true, entre: true }),
  sorgo:      c('Sorgo', 'anuais', 'gramínea', 4, 20, 32, { g: true }),
  trigo:      c('Trigo', 'anuais', 'gramínea', 4, 10, 22),
  batata:     c('Batata-inglesa', 'anuais', 'solanácea', 4, 12, 22, { g: true }),

  cafe:       c('Café arábica', 'perenes', 'rubiácea', 24, 17, 24, { g: true, perene: true }),
  banana:     c('Banana', 'perenes', 'musácea', 24, 20, 30, { g: true, perene: true }),

  aveia:      c('Aveia-preta (adubo verde)', '', 'gramínea', 2, 0, 99, { cobertura: true, entre: true }),
  crotalaria: c('Crotalária (adubo verde)', '', 'leguminosa', 2, 0, 99, { cobertura: true, entre: true }),
  braquiaria: c('Braquiária roçada (cobertura)', '', 'gramínea', 6, 0, 99, { cobertura: true, entre: true }),
};
const NOME_EN = {
  alface: 'Lettuce (iceberg, romaine, mini)', salanova: 'Salanova lettuce (greenhouse)', radicchio: 'Radicchio', chicoria: 'Frisée endive',
  rucula: 'Arugula', agriao: 'Watercress', brocolis: 'Broccoli', couveflor: 'Cauliflower', repolho: 'Cabbage', acelga: 'Napa cabbage',
  couve: 'Collard greens', rabanete: 'Radish', espinafre: 'Spinach', beterraba: 'Beet', cenoura: 'Carrot', salsinha: 'Parsley',
  cebolinha: 'Chives', cebola: 'Red onion', tomate: 'Grape tomato (greenhouse)', pimentao: 'Bell pepper', abobora: 'Kabocha squash',
  abobrinha: 'Zucchini', pepino: 'Cucumber', vagem: 'Green beans', milho: 'Maize', soja: 'Soybean', feijao: 'Common beans', sorgo: 'Sorghum',
  trigo: 'Wheat', batata: 'Potato', cafe: 'Arabica coffee', banana: 'Banana', aveia: 'Black oat (green manure)',
  crotalaria: 'Sunn hemp (green manure)', braquiaria: 'Mowed brachiaria grass (cover)',
};
const nome = id => L(CULTURAS[id].nome, NOME_EN[id]);
const ehPerene = it => CULTURAS[it.c].perene;

// Culturas que o produtor pode escolher num perfil. No perfil de perenes, a faixa é a entrelinha.
const opcoes = perfil => Object.keys(CULTURAS).filter(id => { const k = CULTURAS[id];
  return perfil === 'perenes' ? k.entre : k.p === perfil || (k.cobertura && id !== 'braquiaria'); });

// Resume a resposta mensal do NASA POWER em 12 meses de calendário.
// altitudeReal (m), se informada, corrige a temperatura da célula da grade para a altitude da área.
function resumirClima(power, altitudeReal) {
  const p = power.properties.parameter, altitude = power.geometry.coordinates[2];
  const ajuste = altitudeReal > 0 ? (altitude - altitudeReal) / 100 * GRADIENTE : 0;
  const porMes = k => Array.from({ length: 12 }, (_, m) =>
    Object.entries(p[k]).filter(([d, v]) => +d.slice(4) === m + 1 && v > -900).map(([, v]) => v));
  const media = vs => vs.reduce((a, b) => a + b, 0) / vs.length;
  const chuva = porMes('PRECTOTCORR').map((vs, m) => vs.map(v => v * DIAS[m])); // mm/dia -> mm/mês
  return {
    anos: chuva[0].length, altitude, ajuste,
    chuvaMedia: chuva.map(media),
    chuvaSeca: chuva.map(vs => Math.min(...vs)),
    tMedia: porMes('T2M').map(vs => media(vs) + ajuste),
    tminAbs: porMes('T2M_MIN').map(vs => Math.min(...vs) + ajuste),
    tmaxAbs: porMes('T2M_MAX').map(vs => Math.max(...vs) + ajuste),
  };
}

// Como a cultura se sai num mês de calendário: bom | atencao | risco, com o motivo.
function statusMes(id, m, clima) {
  const k = CULTURAS[id], t = clima.tMedia[m], mes = M()[m], fx = `${k.tmin} ${L('a', 'to')} ${k.tmax} °C`;
  const g = v => (LANG === 'en' ? v.toFixed(1) : v.toFixed(1).replace('.', ','));
  if (k.cobertura) return { s: 'bom', motivo: '' };
  if (k.g && !k.estufa && clima.tminAbs[m] < LIMITE_GEADA) return { s: 'risco', motivo: L(`mínima já registrada de ${g(clima.tminAbs[m])} °C em ${mes}: risco de geada`, `lowest temperature on record of ${g(clima.tminAbs[m])} °C in ${mes}: frost risk`) };
  if (t > k.tmax + 2) return { s: 'risco', motivo: L(`média de ${g(t)} °C em ${mes}, acima da faixa de ${fx}`, `mean of ${g(t)} °C in ${mes}, above the ${fx} range`) };
  if (t < k.tmin - 2) return { s: 'risco', motivo: L(`média de ${g(t)} °C em ${mes}, abaixo da faixa de ${fx}`, `mean of ${g(t)} °C in ${mes}, below the ${fx} range`) };
  if (t > k.tmax || t < k.tmin) return { s: 'atencao', motivo: L(`média de ${g(t)} °C em ${mes}, no limite da faixa de ${fx}`, `mean of ${g(t)} °C in ${mes}, at the edge of the ${fx} range`) };
  if (k.ch && !k.estufa && clima.chuvaMedia[m] > CHUVA_FORTE) return { s: 'atencao', motivo: L(`${Math.round(clima.chuvaMedia[m])} mm de chuva média em ${mes}: doença foliar e perda em campo aberto`, `${Math.round(clima.chuvaMedia[m])} mm of mean rainfall in ${mes}: leaf disease and losses in open field`) };
  return { s: 'bom', motivo: '' };
}
const VALOR = { bom: 1, atencao: 0.5, risco: 0 };

// Calendário produto x mês: em que meses cada cultura do perfil vai bem nesse ponto.
const calendario = (clima, perfil = 'hortalicas') => Object.keys(CULTURAS)
  .filter(id => !CULTURAS[id].cobertura && (CULTURAS[id].p === perfil || (perfil === 'perenes' && id === 'feijao')))
  .map(id => ({ id, meses: MESES_T.pt.map((_, m) => statusMes(id, m, clima)) }));

const ordenar = rot => [...rot].sort((a, b) => ehPerene(b) - ehPerene(a) || a.ini - b.ini);
const mesesDe = it => Array.from({ length: CULTURAS[it.c].ciclo }, (_, k) => it.ini + k).filter(i => i < 24);
const faixa = rot => rot.filter(it => !ehPerene(it)); // o que está na faixa, sem a perene

function avaliar(rot, clima) {
  rot = ordenar(rot);
  const ocupado = Array(24).fill(false);
  const itens = rot.map(it => {
    const k = CULTURAS[it.c], ms = mesesDe(it);
    if (!k.perene) ms.forEach(i => (ocupado[i] = true));
    const status = ms.map(i => statusMes(it.c, mesCal(i), clima));
    const chuva = k.estufa ? 0 : ms.reduce((s, i) => s + clima.chuvaMedia[mesCal(i)], 0);
    return { ...it, status, meses: ms.length, irrigacao: k.cobertura ? 0 : Math.max(0, AGUA_MES * ms.length - chuva),
      mesesSecos: k.perene ? [] : ms.filter(i => clima.chuvaMedia[mesCal(i)] < MES_SECO) };
  });
  const livres = ocupado.map((o, i) => (o ? -1 : i)).filter(i => i >= 0);
  const chuvaTotal = ocupado.reduce((s, _, i) => s + clima.chuvaMedia[mesCal(i)], 0);
  const chuvaSoloNu = livres.reduce((s, i) => s + clima.chuvaMedia[mesCal(i)], 0);
  // Repetição conta só entre culturas colhidas: adubo verde no meio não apaga milho depois de milho.
  const seq = faixa(rot).filter(it => !CULTURAS[it.c].cobertura);
  let repeticoes = 0;
  for (let k = 1; k < seq.length; k++) if (CULTURAS[seq[k - 1].c].familia === CULTURAS[seq[k].c].familia) repeticoes++;
  const perene = rot.some(ehPerene);
  const comerciais = itens.filter(it => !CULTURAS[it.c].cobertura);
  const mesesCom = comerciais.reduce((s, it) => s + it.meses, 0);
  const pontosClima = comerciais.reduce((s, it) => s + it.status.reduce((a, st) => a + VALOR[st.s], 0), 0);
  const irrigacao = itens.reduce((s, it) => s + it.irrigacao, 0);
  const familias = new Set(itens.map(it => CULTURAS[it.c].familia)).size;
  return {
    itens, ocupado, perene, mesesSoloNu: livres.length, chuvaSoloNu, chuvaTotal, repeticoes, irrigacao, mesesCom, familias,
    mesesRisco: comerciais.reduce((s, it) => s + it.status.filter(st => st.s === 'risco').length, 0),
    mesesAtencao: comerciais.reduce((s, it) => s + it.status.filter(st => st.s === 'atencao').length, 0),
    notas: { // 0 a 1, maior é melhor
      clima: mesesCom ? pontosClima / mesesCom : 0,
      // com perene não há rotação: a nota mede quantas famílias de planta convivem na área (1 = monocultura pura)
      pragas: perene ? Math.min(1, (familias - 1) / 2) : seq.length > 1 ? 1 - repeticoes / (seq.length - 1) : 0,
      solo: 1 - chuvaSoloNu / chuvaTotal,
      agua: mesesCom ? 1 - Math.min(1, irrigacao / (AGUA_MES * mesesCom)) : 1,
    },
  };
}

// Nota final ponderada pelas prioridades do produtor (pesos 0 a 10).
function pontuar(av, pesos) {
  const ks = Object.keys(av.notas), total = ks.reduce((s, k) => s + (pesos[k] || 0), 0) || 1;
  return ks.reduce((s, k) => s + av.notas[k] * (pesos[k] || 0), 0) / total;
}

// Preenche janelas livres de 2+ meses com adubo verde: crotalária no calor, aveia no frio.
function cobrirSolo(rot, clima) {
  rot = ordenar(rot).map(it => ({ ...it }));
  for (let guarda = 0; guarda < 12; guarda++) {
    const ocupado = avaliar(rot, clima).ocupado;
    let ini = -1;
    for (let i = 0; i <= 22 && ini < 0; i++) if (!ocupado[i] && !ocupado[i + 1]) ini = i;
    if (ini < 0) break;
    const quente = [ini, ini + 1].every(i => clima.tMedia[mesCal(i)] >= 18 && clima.tminAbs[mesCal(i)] >= LIMITE_GEADA);
    rot.push({ c: quente ? 'crotalaria' : 'aveia', ini, nova: true });
    rot = ordenar(rot);
  }
  return rot;
}

const aptidao = (id, ini, clima) => { const ms = mesesDe({ c: id, ini }); return ms.reduce((s, i) => s + VALOR[statusMes(id, mesCal(i), clima).s], 0) / ms.length; };

// Troca a cultura que repete a família da anterior, ou que está fora do clima, pela do mesmo perfil
// que melhor se encaixa naqueles meses sem repetir a família das vizinhas. Depois cobre as janelas.
function alternar(rot, clima) {
  rot = ordenar(rot).map(it => ({ ...it }));
  const fam = it => (it ? CULTURAS[it.c].familia : '');
  for (let k = 0; k < rot.length; k++) {
    const it = rot[k], atual = CULTURAS[it.c];
    if (atual.cobertura) continue;
    const repete = k > 0 && fam(rot[k - 1]) === atual.familia;
    if (!repete && aptidao(it.c, it.ini, clima) >= 1) continue;
    const espaco = (rot[k + 1] ? rot[k + 1].ini : 24) - it.ini;
    const melhor = Object.keys(CULTURAS)
      .filter(id => CULTURAS[id].p === atual.p && !CULTURAS[id].estufa === !atual.estufa && CULTURAS[id].ciclo <= espaco
        && CULTURAS[id].familia !== fam(rot[k - 1]) && CULTURAS[id].familia !== fam(rot[k + 1]))
      .map(id => ({ id, a: aptidao(id, it.ini, clima), d: Math.abs(CULTURAS[id].ciclo - atual.ciclo) }))
      .sort((x, y) => y.a - x.a || x.d - y.d)[0];
    if (melhor && melhor.a >= 0.5 && (repete || melhor.a > aptidao(it.c, it.ini, clima)))
      rot[k] = { c: melhor.id, ini: it.ini, nova: true, antes: it.c };
    else if (repete && espaco >= 2) // nada do perfil cabe bem nesses meses: a faixa descansa com adubo verde
      rot[k] = { c: clima.tMedia[mesCal(it.ini)] >= 18 ? 'crotalaria' : 'aveia', ini: it.ini, nova: true, antes: it.c };
  }
  return cobrirSolo(rot, clima);
}

// Perene: planta feijão na entrelinha na melhor janela de cada ano (clima bom e mais chuva) e cobre o resto.
function consorciar(rot, clima) {
  rot = ordenar(rot).map(it => ({ ...it }));
  for (const [de, ate] of [[0, 11], [12, 21]]) {
    const ocupado = avaliar(rot, clima).ocupado;
    const janela = Array.from({ length: ate - de + 1 }, (_, k) => de + k)
      .filter(i => i + 2 < 24 && [i, i + 1, i + 2].every(j => !ocupado[j]) && aptidao('feijao', i, clima) >= 1)
      .map(i => ({ i, chuva: [i, i + 1, i + 2].reduce((s, j) => s + clima.chuvaMedia[mesCal(j)], 0) }))
      .sort((x, y) => y.chuva - x.chuva)[0];
    if (janela && janela.chuva >= 3 * MES_SECO) rot.push({ c: 'feijao', ini: janela.i, nova: true });
  }
  return cobrirSolo(rot, clima);
}

function comparar(rotAtual, clima, pesos) {
  const perene = rotAtual.some(ehPerene);
  const lista = perene ? [
    { id: 'atual', titulo: L('Manejo atual da entrelinha', 'Current inter-row management'), rot: ordenar(rotAtual),
      porque: L('É como a entrelinha está hoje. Cultura perene não entra em rotação: fica anos no mesmo lugar. O que dá para mudar é o que acontece entre as linhas.',
        'This is the inter-row as it is today. A perennial crop does not rotate: it stays in place for years. What can change is what happens between the rows.') },
    { id: 'cobrir', titulo: L('Adubo verde na entrelinha', 'Green manure between the rows'), rot: cobrirSolo(rotAtual, clima),
      porque: L('Ocupa a entrelinha com adubo verde, alternando leguminosa no calor e gramínea no frio, para a chuva não cair em solo descoberto e para quebrar a monocultura sem tirar a cultura principal.',
        'Fills the inter-row with green manure, a legume in the warm months and a grass in the cold ones, so rain does not fall on bare soil and the monoculture is broken without removing the main crop.') },
    { id: 'alternar', titulo: L('Cultura anual consorciada e adubo verde', 'Intercropped annual crop plus green manure'), rot: consorciar(rotAtual, clima),
      porque: L('Planta feijão na entrelinha na janela mais chuvosa em que o clima serve, o que traz uma segunda colheita e nitrogênio, e mantém adubo verde no resto do tempo.',
        'Plants beans between the rows in the wettest window that fits the climate, which adds a second harvest and nitrogen, and keeps green manure the rest of the time.') },
  ] : [
    { id: 'atual', titulo: L('Rotação atual', 'Current rotation'), rot: ordenar(rotAtual),
      porque: L('É o que a área recebe hoje. Serve de base para medir as outras duas.', 'This is what the area receives today. It is the baseline for the other two.') },
    { id: 'cobrir', titulo: L('Mesmas culturas, com adubo verde nas janelas', 'Same crops, with green manure in the idle windows'), rot: cobrirSolo(rotAtual, clima),
      porque: L('Mantém o que você já planta e ocupa as janelas de dois meses ou mais com adubo verde, para a chuva não cair em solo descoberto e para dar descanso entre culturas.',
        'Keeps what you already grow and fills idle windows of two months or more with green manure, so rain does not fall on bare soil and the land rests between crops.') },
    { id: 'alternar', titulo: L('Alternar famílias e ajustar ao clima', 'Alternate plant families and fit crops to the climate'), rot: alternar(rotAtual, clima),
      porque: L('Onde a mesma família de planta entra duas vezes seguidas, ou onde a cultura cai em mês fora da sua faixa de temperatura, troca por outra do mesmo perfil que se encaixa melhor naqueles meses. As janelas recebem adubo verde.',
        'Where the same plant family comes twice in a row, or a crop falls in months outside its temperature range, it is replaced by another crop of the same profile that fits those months better. Idle windows get green manure.') },
  ];
  return lista.map(e => { const av = avaliar(e.rot, clima); return { ...e, av, nota: pontuar(av, pesos) }; });
}

// Resume a Produção Agrícola Municipal do IBGE (SIDRA, tabela 5457, área colhida em hectares).
function resumirLavouras(sidra) {
  const linhas = sidra.slice(1).map(x => ({ nome: x.D4N, ha: +x.V, ano: x.D3N, municipio: x.D1N })).filter(x => x.ha > 0);
  const total = (linhas.find(x => x.nome === 'Total') || {}).ha || 0;
  const itens = linhas.filter(x => x.nome !== 'Total' && !/ (Arábica|Canephora)$/.test(x.nome))
    .map(x => ({ ...x, nome: x.nome.replace(/ \(.*?\)| Total$/g, ''), parte: total ? x.ha / total : 0 }))
    .sort((a, b) => b.ha - a.ha);
  return { total, itens, ano: linhas[0] && linhas[0].ano, municipio: linhas[0] && linhas[0].municipio };
}

const FieldShift = { get MESES() { return M(); }, setLang, L, nome, perfilNome, faixaNome, CULTURAS, PERFIS, DIAS, LIMITE_GEADA, CHUVA_FORTE, MES_SECO, AGUA_MES, mesCal, rotulo, opcoes, ehPerene, resumirClima, statusMes, calendario, avaliar, pontuar, cobrirSolo, alternar, consorciar, comparar, resumirLavouras };
if (typeof module !== 'undefined') module.exports = FieldShift;
