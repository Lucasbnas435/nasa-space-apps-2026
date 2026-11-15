// Field Shift - modelo de comparação de rotações para hortaliças. Funções puras: navegador e node.
// Linha do tempo: 24 meses, índice 0 = julho do ano 1. Um "canteiro" recebe uma sequência de culturas.

const DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCal = i => (6 + i) % 12;
const rotulo = i => `${MESES[mesCal(i)]}/ano ${i < 6 ? 1 : i < 18 ? 2 : 3}`;

const LIMITE_GEADA = 3;    // °C de mínima absoluta do mês abaixo da qual há risco de geada
const CHUVA_FORTE = 200;   // mm no mês acima do qual folhosa em campo aberto pede atenção
const AGUA_MES = 120;      // ponytail: referência única de 4 mm/dia para toda cultura; trocar por Kc da FAO-56 por cultura quando o agrônomo revisar
const GRADIENTE = 0.65;    // °C a cada 100 m de altitude (gradiente térmico padrão)

// ponytail: tabela escrita de memória, PENDENTE de revisão do agrônomo. Trocar aqui, só aqui.
// ciclo = meses no canteiro; t = faixa de temperatura média mensal em que a cultura vai bem (°C);
// g = sensível a geada; ch = sensível a chuva forte em campo aberto; estufa = cultivo protegido (chuva e geada não contam).
const c = (nome, familia, ciclo, tmin, tmax, o = {}) => ({ nome, familia, ciclo, tmin, tmax, g: false, ch: false, estufa: false, cobertura: false, ...o });
const CULTURAS = {
  alface:     c('Alface (americana, romana, mini)', 'asterácea', 2, 12, 22, { ch: true }),
  salanova:   c('Alface Salanova (estufa)', 'asterácea', 2, 12, 24, { estufa: true }),
  radicchio:  c('Radicchio', 'asterácea', 3, 10, 20, { ch: true }),
  chicoria:   c('Chicória frisée', 'asterácea', 3, 12, 22, { ch: true }),
  rucula:     c('Rúcula', 'brássica', 2, 12, 24, { ch: true }),
  agriao:     c('Agrião', 'brássica', 2, 10, 20, { ch: true }),
  brocolis:   c('Brócolis ninja', 'brássica', 3, 12, 22),
  couveflor:  c('Couve-flor', 'brássica', 4, 12, 20),
  repolho:    c('Repolho', 'brássica', 4, 12, 24),
  acelga:     c('Acelga', 'brássica', 3, 12, 22, { ch: true }),
  couve:      c('Couve manteiga', 'brássica', 6, 12, 24),
  rabanete:   c('Rabanete', 'brássica', 1, 10, 22),
  espinafre:  c('Espinafre', 'amarantácea', 2, 8, 20, { ch: true }),
  beterraba:  c('Beterraba', 'amarantácea', 3, 10, 22),
  cenoura:    c('Cenoura', 'apiácea', 4, 12, 24),
  salsinha:   c('Salsinha', 'apiácea', 4, 10, 24),
  cebolinha:  c('Cebolinha', 'aliácea', 3, 10, 24),
  cebola:     c('Cebola roxa', 'aliácea', 5, 12, 24),
  tomate:     c('Tomate grape (estufa)', 'solanácea', 6, 16, 26, { g: true, estufa: true }),
  pimentao:   c('Pimentão', 'solanácea', 6, 18, 28, { g: true }),
  abobora:    c('Abóbora cabotiá', 'cucurbitácea', 4, 18, 28, { g: true }),
  abobrinha:  c('Abobrinha italiana', 'cucurbitácea', 3, 18, 28, { g: true }),
  pepino:     c('Pepino', 'cucurbitácea', 3, 18, 28, { g: true }),
  vagem:      c('Vagem', 'leguminosa', 3, 16, 26, { g: true }),
  aveia:      c('Aveia-preta (adubo verde)', 'gramínea', 2, 0, 99, { cobertura: true }),
  crotalaria: c('Crotalária (adubo verde)', 'leguminosa', 2, 0, 99, { cobertura: true }),
};

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
  const k = CULTURAS[id], t = clima.tMedia[m], g = v => v.toFixed(1).replace('.', ',');
  if (k.cobertura) return { s: 'bom', motivo: '' };
  if (k.g && !k.estufa && clima.tminAbs[m] < LIMITE_GEADA) return { s: 'risco', motivo: `mínima já registrada de ${g(clima.tminAbs[m])} °C em ${MESES[m]}: risco de geada` };
  if (t > k.tmax + 2) return { s: 'risco', motivo: `média de ${g(t)} °C em ${MESES[m]}, acima da faixa de ${k.tmin} a ${k.tmax} °C` };
  if (t < k.tmin - 2) return { s: 'risco', motivo: `média de ${g(t)} °C em ${MESES[m]}, abaixo da faixa de ${k.tmin} a ${k.tmax} °C` };
  if (t > k.tmax || t < k.tmin) return { s: 'atencao', motivo: `média de ${g(t)} °C em ${MESES[m]}, no limite da faixa de ${k.tmin} a ${k.tmax} °C` };
  if (k.ch && !k.estufa && clima.chuvaMedia[m] > CHUVA_FORTE) return { s: 'atencao', motivo: `${Math.round(clima.chuvaMedia[m])} mm de chuva média em ${MESES[m]}: doença foliar e perda em campo aberto` };
  return { s: 'bom', motivo: '' };
}
const VALOR = { bom: 1, atencao: 0.5, risco: 0 };

// Calendário produto x mês: em que meses cada cultura do portfólio vai bem nesse ponto.
const calendario = clima => Object.keys(CULTURAS).filter(id => !CULTURAS[id].cobertura)
  .map(id => ({ id, meses: MESES.map((_, m) => statusMes(id, m, clima)) }));

const ordenar = rot => [...rot].sort((a, b) => a.ini - b.ini);
const mesesDe = it => Array.from({ length: CULTURAS[it.c].ciclo }, (_, k) => it.ini + k).filter(i => i < 24);

function avaliar(rot, clima) {
  rot = ordenar(rot);
  const ocupado = Array(24).fill(false);
  const itens = rot.map(it => {
    const k = CULTURAS[it.c], ms = mesesDe(it);
    ms.forEach(i => (ocupado[i] = true));
    const status = ms.map(i => statusMes(it.c, mesCal(i), clima));
    const chuva = k.estufa ? 0 : ms.reduce((s, i) => s + clima.chuvaMedia[mesCal(i)], 0);
    return { ...it, status, meses: ms.length, irrigacao: k.cobertura ? 0 : Math.max(0, AGUA_MES * ms.length - chuva) };
  });
  const livres = ocupado.map((o, i) => (o ? -1 : i)).filter(i => i >= 0);
  const chuvaTotal = ocupado.reduce((s, _, i) => s + clima.chuvaMedia[mesCal(i)], 0);
  const chuvaSoloNu = livres.reduce((s, i) => s + clima.chuvaMedia[mesCal(i)], 0);
  let repeticoes = 0;
  for (let k = 1; k < rot.length; k++)
    if (CULTURAS[rot[k].c].familia === CULTURAS[rot[k - 1].c].familia && !(CULTURAS[rot[k].c].cobertura && CULTURAS[rot[k - 1].c].cobertura)) repeticoes++; // adubo verde seguido não conta
  const comerciais = itens.filter(it => !CULTURAS[it.c].cobertura);
  const mesesCom = comerciais.reduce((s, it) => s + it.meses, 0);
  const pontosClima = comerciais.reduce((s, it) => s + it.status.reduce((a, st) => a + VALOR[st.s], 0), 0);
  const irrigacao = itens.reduce((s, it) => s + it.irrigacao, 0);
  return {
    itens, ocupado, mesesSoloNu: livres.length, chuvaSoloNu, chuvaTotal, repeticoes, irrigacao, mesesCom,
    mesesRisco: comerciais.reduce((s, it) => s + it.status.filter(st => st.s === 'risco').length, 0),
    mesesAtencao: comerciais.reduce((s, it) => s + it.status.filter(st => st.s === 'atencao').length, 0),
    notas: { // 0 a 1, maior é melhor
      clima: mesesCom ? pontosClima / mesesCom : 0,
      pragas: rot.length > 1 ? 1 - repeticoes / (rot.length - 1) : 0,
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

// Troca a cultura que repete a família da anterior, ou que está fora do clima, pela do portfólio
// que melhor se encaixa naqueles meses sem repetir a família das vizinhas. Depois cobre as janelas.
function alternar(rot, clima) {
  rot = ordenar(rot).map(it => ({ ...it }));
  const fam = it => (it ? CULTURAS[it.c].familia : '');
  const aptidao = (id, ini) => { const ms = mesesDe({ c: id, ini }); return ms.reduce((s, i) => s + VALOR[statusMes(id, mesCal(i), clima).s], 0) / ms.length; };
  for (let k = 0; k < rot.length; k++) {
    const it = rot[k], atual = CULTURAS[it.c];
    if (atual.cobertura) continue;
    const repete = k > 0 && fam(rot[k - 1]) === atual.familia;
    if (!repete && aptidao(it.c, it.ini) >= 1) continue;
    const espaco = (rot[k + 1] ? rot[k + 1].ini : 24) - it.ini;
    const melhor = Object.keys(CULTURAS)
      .filter(id => !CULTURAS[id].cobertura && !CULTURAS[id].estufa === !atual.estufa && CULTURAS[id].ciclo <= espaco
        && CULTURAS[id].familia !== fam(rot[k - 1]) && CULTURAS[id].familia !== fam(rot[k + 1]))
      .map(id => ({ id, a: aptidao(id, it.ini), d: Math.abs(CULTURAS[id].ciclo - atual.ciclo) }))
      .sort((x, y) => y.a - x.a || x.d - y.d)[0];
    if (melhor && melhor.a >= 0.5 && (repete || melhor.a > aptidao(it.c, it.ini)))
      rot[k] = { c: melhor.id, ini: it.ini, nova: true, antes: it.c };
    else if (repete && espaco >= 2) // nada do portfólio cabe bem nesses meses: o canteiro descansa com adubo verde
      rot[k] = { c: clima.tMedia[mesCal(it.ini)] >= 18 ? 'crotalaria' : 'aveia', ini: it.ini, nova: true, antes: it.c };
  }
  return cobrirSolo(rot, clima);
}

function comparar(rotAtual, clima, pesos) {
  return [
    { id: 'atual', titulo: 'Rotação atual', rot: ordenar(rotAtual),
      porque: 'É o que o canteiro recebe hoje. Serve de base para medir as outras duas.' },
    { id: 'cobrir', titulo: 'Mesmas culturas, com adubo verde nas janelas', rot: cobrirSolo(rotAtual, clima),
      porque: 'Mantém o que você já planta e ocupa as janelas de dois meses ou mais com adubo verde, para a chuva não cair em solo descoberto e para dar descanso entre culturas.' },
    { id: 'alternar', titulo: 'Alternar famílias e ajustar ao clima', rot: alternar(rotAtual, clima),
      porque: 'Onde a mesma família de planta entra duas vezes seguidas, ou onde a cultura cai em mês fora da sua faixa de temperatura, troca por outra do portfólio que se encaixa melhor naqueles meses. As janelas recebem adubo verde.' },
  ].map(e => { const av = avaliar(e.rot, clima); return { ...e, av, nota: pontuar(av, pesos) }; });
}

const FieldShift = { CULTURAS, MESES, DIAS, LIMITE_GEADA, CHUVA_FORTE, AGUA_MES, mesCal, rotulo, resumirClima, statusMes, calendario, avaliar, pontuar, cobrirSolo, alternar, comparar };
if (typeof module !== 'undefined') module.exports = FieldShift;
