# Mexico en Datos

Datos oficiales de Mexico en un solo lugar, con graficas interactivas y un asistente de IA.

**[datamx.sebastian.mx](https://datamx.sebastian.mx)**

## Que es

Mexico en Datos reune indicadores publicos de INEGI, Banxico, ENOE, ENVIPE, SESNSP, Secretaria de Salud y ENSANUT. Puedes explorar la economia, el empleo, la seguridad y la salud de Mexico a traves de graficas interactivas o preguntarle directamente a un asistente de IA.

## Fuentes de datos

| Fuente | Datos | Frecuencia |
|---|---|---|
| INEGI | PIB, IGAE, empleo, comercio, confianza del consumidor | Quincenal a trimestral |
| Banxico | Inflacion, tipo de cambio, tasa objetivo, TIIE | Diaria a mensual |
| SESNSP | Homicidios dolosos por estado | Mensual |
| ENOE | Informalidad, salarios, desempleo por sector/edad/genero | Trimestral |
| ENVIPE | Cifra negra, victimizacion, confianza institucional | Anual |
| Sec. Salud | Mortalidad por causas, infraestructura de salud (CLUES) | Anual |
| ENSANUT | Obesidad, diabetes, hipertension por estado | Cada 6 anos |

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Base de datos**: PostgreSQL (Neon)
- **IA**: Claude via Vercel AI SDK (streaming)
- **Graficas**: Canvas 2D + SVG (custom — sin dependencias externas)
- **Pipelines**: Python + uv, sincronizados via GitHub Actions
- **Hosting**: Vercel

## Desarrollo local

```bash
# Pipelines de datos (Python)
uv sync
uv run python -m ingest.pipelines.banxico --full

# Frontend (Next.js)
cd app
npm install
cp .env.example .env.local  # agregar DATABASE_URL, ANTHROPIC_API_KEY
npm run dev
```

## Contribuir

Issues y pull requests son bienvenidos. Si encuentras un error en los datos, [reportalo aqui](https://github.com/sjbp/mexico-en-datos/issues/new?labels=bug&title=%5BBug%5D+).

## Apoyar

Si este proyecto te es util, puedes apoyarlo en [buymeacoffee.com/datamx](https://buymeacoffee.com/datamx).

## Licencia

Los datos provienen de fuentes publicas del gobierno de Mexico y son de libre uso. El codigo fuente de este proyecto es open source.
