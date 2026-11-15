# Field Shift

Decision support for crop rotation, built for the NASA Space Apps Challenge 2026, challenge **"Field Shift: Adapting Farms with NASA Data"**.

A grower enters a location, what one bed (or field) receives over two years and what matters most to them. The tool fetches ten years of NASA climate data for that point and returns:

1. **A product-by-month calendar**: in which months each crop fits the local temperature, where it sits at the limit and where it falls outside (or faces frost), with the reason for every cell.
2. **Three rotation strategies compared**, always including the current one:
   - the current rotation;
   - the same crops, with green manure in the idle windows;
   - alternating plant families and fitting crops to the climate.
3. For each strategy: why it is suggested, the evidence behind it, benefits over the current rotation, and risks that need local review.
4. A closing box, **"what this tool does not know"**, stating its limits on screen.

The tool supports the grower's and the agronomist's judgment. It does not replace it.

The interface is in Brazilian Portuguese, written for growers with little technical background.

## How to run

No build, no backend, no API key.

```bash
python -m http.server 5188
```

Then open `http://localhost:5188`. The page calls the NASA POWER API directly from the browser.

Model self-check against live NASA data (Node 18+):

```bash
node teste.js
```

## NASA data used

**NASA POWER** (Prediction Of Worldwide Energy Resources), monthly point API, agroclimatology community, 2015 to 2024:

| Parameter | Use |
|---|---|
| `PRECTOTCORR` | monthly rainfall, mean and driest year per month |
| `T2M` | monthly mean temperature, matched against each crop's range |
| `T2M_MIN` | lowest temperature recorded per month, frost risk |
| `T2M_MAX` | highest temperature recorded per month |

The POWER grid cell is about 50 km wide. The grower can enter the real altitude of the area and the tool corrects temperature by the standard lapse rate (0.65 °C per 100 m). Rainfall is not corrected.

## How the model works

Everything is in `modelo.js`, as pure functions that run in the browser and in Node.

- **Timeline:** 24 months, starting in July.
- **Crop table (`CULTURAS`):** 24 vegetables plus two green manures, each with plant family, cycle length, temperature range, frost sensitivity, sensitivity to heavy rain in open field and whether it is grown under cover.
- **Monthly status (`statusMes`):** good, attention or risk, always with the reason in plain language.
- **Evaluation (`avaliar`):** four scores from 0 to 1:
  - climate fit (share of crop-months inside the temperature range);
  - pest cycle break (same plant family in sequence);
  - soil protection (share of rainfall that falls on an empty bed);
  - irrigation (reference demand minus mean rainfall).
- **Final score (`pontuar`):** weighted by the grower's four priority sliders.
- **Alternatives:** `cobrirSolo` fills idle windows of two months or more with green manure (sunn hemp when warm, black oat when cold). `alternar` replaces a crop that repeats the previous family, or that falls outside its climate window, with the best-fitting crop from the table; when nothing fits, the bed rests under green manure.

## Limits

These are also shown on screen.

- The crop table (temperature ranges, cycle lengths) was written from general reference knowledge and **has not been reviewed by a local agronomist yet**. Summer and winter cultivars shift these ranges.
- Water demand uses a single reference of 4 mm per day for every crop.
- For greenhouse crops the tool uses outside air temperature, which is lower than inside the structure.
- No soil analysis, slope or pest history of the area.
- No prices, costs or market demand.
- One bed at a time. Planning supply of every product across many beds is out of scope.
- Ten years of past climate do not guarantee the next one.

## Not done yet

- Other NASA datasets named in the challenge (SMAP, GPM, ECOSTRESS, Landsat, MODIS, GRACE, SRTM, GEDI).
- Interactive map.
- Grower profiles beyond vegetables (grains, perennials such as coffee and banana).
- Municipal context from official Brazilian sources (IBGE, CONAB, MapBiomas).
- English interface.

## Use of AI

The code, the crop reference table and this document were written with Claude Code (Anthropic) under the direction of the team, who defined the problem, the target grower and the scope, and reviewed the results. The running application does not call any AI model: every number on screen comes from NASA POWER data and the rules in `modelo.js`.

## Files

| File | Content |
|---|---|
| `index.html` | the page: form, climate chart, calendar, strategy cards |
| `modelo.js` | crop table and rotation model |
| `teste.js` | self-check of the model against live NASA POWER data |
