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

  console.log('chuva anual (mm):', Math.round(anual), '| T média por mês:', clima.tMedia.map(t => t.toFixed(1)).join(' '));
  for (const e of [a, b, c])
    console.log(e.id.padEnd(9), 'nota', e.nota.toFixed(2), JSON.stringify(Object.fromEntries(Object.entries(e.av.notas).map(([k, v]) => [k, +v.toFixed(2)]))),
      '|', e.rot.map(i => `${i.c}@${F.rotulo(i.ini)}`).join(', '));
  const sim = { bom: 'o', atencao: '~', risco: 'X' };
  for (const l of F.calendario(clima)) console.log(l.id.padEnd(10), l.meses.map(m => sim[m.s]).join(' '));
  console.log('OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
