// Checagem única: roda o modelo com dado real do NASA POWER. Uso: node teste.js
const assert = require('assert');
const F = require('./modelo.js');
const URL = 'https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,T2M,T2M_MAX,T2M_MIN&community=AG&longitude=-46.57&latitude=-22.07&start=2015&end=2024&format=JSON';

(async () => {
  const bruto = await (await fetch(URL)).json();
  const clima = F.resumirClima(bruto);
  assert.strictEqual(clima.anos, 10);
  const anual = clima.chuvaMedia.reduce((a, b) => a + b, 0);
  assert(anual > 800 && anual < 2500, 'chuva anual fora do plausível: ' + anual);

  // correção de altitude: 300 m acima da célula esfria 1,95 °C
  const alto = F.resumirClima(bruto, clima.altitude + 300);
  assert(Math.abs(clima.tMedia[0] - alto.tMedia[0] - 1.95) < 0.01, 'correção de altitude errada');

  // exemplo: alface sobre alface e brássica sobre brássica
  const atual = [{ c: 'alface', ini: 0 }, { c: 'alface', ini: 2 }, { c: 'brocolis', ini: 4 }, { c: 'repolho', ini: 8 }, { c: 'alface', ini: 13 }, { c: 'brocolis', ini: 15 }];
  const [a, b, c] = F.comparar(atual, clima, { clima: 5, pragas: 5, solo: 5, agua: 5 });
  assert.strictEqual(a.av.repeticoes, 2);
  assert(b.av.mesesSoloNu < a.av.mesesSoloNu, 'cobrir não reduziu solo nu');
  assert.deepStrictEqual(b.rot.filter(i => !i.nova), a.rot, 'cobrir mexeu nas culturas do produtor');
  assert.strictEqual(c.av.repeticoes, 0, 'alternar deixou família repetida');
  assert(c.av.notas.clima >= a.av.notas.clima, 'alternar piorou o encaixe no clima');
  assert(c.nota > a.nota, 'alternar não superou a atual');
  for (const e of [a, b, c]) { // nenhuma estratégia pode sobrepor culturas nem passar de 24 meses
    const usados = e.rot.flatMap(it => Array.from({ length: F.CULTURAS[it.c].ciclo }, (_, k) => it.ini + k));
    assert.strictEqual(new Set(usados).size, usados.length, 'sobreposição em ' + e.id);
    assert(usados.every(i => i < 24), 'passou de 24 meses em ' + e.id);
  }
  // geada reprova cultura sensível em campo, mas não a de estufa
  const frio = { ...clima, tminAbs: clima.tminAbs.map(() => 0) };
  assert.strictEqual(F.statusMes('pepino', 6, frio).s, 'risco');
  assert.notStrictEqual(F.statusMes('tomate', 0, frio).motivo.includes('geada'), true);

  // perfil de lavouras anuais: milho sobre milho troca por cultura do MESMO perfil
  const [ga, , gc] = F.comparar([{ c: 'milho', ini: 3 }, { c: 'milho', ini: 15 }], clima, { clima: 5, pragas: 5, solo: 5, agua: 5 });
  assert.strictEqual(ga.av.repeticoes, 1);
  assert.strictEqual(gc.av.repeticoes, 0, 'anuais: família repetida');
  assert(gc.rot.every(i => F.CULTURAS[i.c].cobertura || F.CULTURAS[i.c].p === 'anuais'), 'anuais: saiu do perfil');

  // perene: café com entrelinha nua. A perene fica em todas as estratégias e não ocupa a faixa.
  const [pa, pb, pc] = F.comparar([{ c: 'cafe', ini: 0 }], clima, { clima: 5, pragas: 5, solo: 5, agua: 5 });
  assert.strictEqual(pa.av.mesesSoloNu, 24);
  assert.strictEqual(pa.av.notas.pragas, 0, 'monocultura pura deveria ter nota 0 em diversidade');
  assert(pb.av.mesesSoloNu < 4, 'perene: adubo verde não cobriu a entrelinha');
  assert(pc.rot.some(i => i.c === 'feijao'), 'perene: consórcio sem feijão');
  for (const e of [pa, pb, pc]) {
    assert.strictEqual(e.rot.filter(F.ehPerene).length, 1, 'perene sumiu em ' + e.id);
    const usados = e.rot.filter(i => !F.ehPerene(i)).flatMap(it => Array.from({ length: F.CULTURAS[it.c].ciclo }, (_, k) => it.ini + k));
    assert.strictEqual(new Set(usados).size, usados.length, 'sobreposição na entrelinha em ' + e.id);
    assert(e.rot.every(i => F.ehPerene(i) || F.CULTURAS[i.c].entre), 'entrelinha recebeu cultura não permitida em ' + e.id);
  }
  assert(pc.nota > pa.nota && pb.nota > pa.nota, 'perene: alternativas não superaram a entrelinha nua');

  // IBGE: resumo da produção municipal (Andradas = 3102605)
  const lav = F.resumirLavouras(await (await fetch('https://apisidra.ibge.gov.br/values/t/5457/n6/3102605/v/216/p/last%201/c782/all')).json());
  assert(lav.total > 0 && lav.itens[0].nome === 'Café', 'IBGE: esperava café no topo, veio ' + (lav.itens[0] || {}).nome);
  assert(lav.itens.filter(i => /Café/.test(i.nome)).length === 1, 'IBGE: café duplicado');
  console.log('IBGE', lav.municipio, lav.ano, '| total', lav.total, 'ha |', lav.itens.slice(0, 5).map(i => `${i.nome} ${Math.round(i.parte * 100)}%`).join(', '));
  for (const e of [gc, pa, pb, pc]) console.log(e.id.padEnd(9), 'nota', e.nota.toFixed(2), '|', e.rot.map(i => `${i.c}@${F.rotulo(i.ini)}`).join(', '));

  console.log('chuva anual (mm):', Math.round(anual), '| T média por mês:', clima.tMedia.map(t => t.toFixed(1)).join(' '));
  for (const e of [a, b, c])
    console.log(e.id.padEnd(9), 'nota', e.nota.toFixed(2), JSON.stringify(Object.fromEntries(Object.entries(e.av.notas).map(([k, v]) => [k, +v.toFixed(2)]))),
      '|', e.rot.map(i => `${i.c}@${F.rotulo(i.ini)}`).join(', '));
  const sim = { bom: 'o', atencao: '~', risco: 'X' };
  for (const l of F.calendario(clima)) console.log(l.id.padEnd(10), l.meses.map(m => sim[m.s]).join(' '));
  console.log('OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
