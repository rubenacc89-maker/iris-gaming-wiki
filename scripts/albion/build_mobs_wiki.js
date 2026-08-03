/**
 * build_mobs_wiki.js — Generate mob/boss/dungeon articles for Iris wiki
 */
const fs = require('fs')
const path = require('path')
const SCRATCHPAD = process.argv[2]
const WIKI_DIR = process.argv[3]
const OUT_DIR = path.join(WIKI_DIR, 'games', 'albion-online')

console.log('Loading data...')
const mobData = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'mobs.json'), 'utf8'))
const localeRaw = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'localization.json'), 'utf8'))

// Build locale map
const locale = {}
;(localeRaw.tmx.body.tu || []).forEach(entry => {
  const key = entry['@tuid']; if (!key) return
  const tuv = entry.tuv
  let text = null
  if (Array.isArray(tuv)) { const en = tuv.find(t => t['@xml:lang'] === 'EN-US'); text = en ? en.seg : tuv[0]?.seg }
  else text = tuv?.seg
  if (text) locale[key] = (typeof text === 'string' ? text : String(text)).replace(/\[[^\]]+\]/g, '').trim()
})

const allMobs = Array.isArray(mobData.Mobs.Mob) ? mobData.Mobs.Mob : [mobData.Mobs.Mob]
console.log('Total mobs:', allMobs.length)

function mobDisplayName(uniquename) {
  // Try locale
  const stripped = uniquename.replace(/^T\d+_/, '')
  const tries = ['@MOBS_' + stripped, '@MOBS_' + uniquename, '@MOB_' + stripped]
  for (const key of tries) {
    const n = locale[key]
    if (n && n.length > 1 && !n.includes('$')) return n
  }
  // Prettify internal name
  return uniquename
    .replace(/^T\d+_MOB_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function factionEs(faction) {
  const map = {
    UNDEAD: 'No-muerto', HERETIC: 'Hereje', MORGANA: 'Morgana', KEEPER: 'Keeper',
    DEMON: 'Demonio', CRITTER: 'Animal', AVALON: 'Avalonian', CORRUPTED: 'Corrupted',
    ARCANE: 'Arcano', ROAD: 'Carretera', ROAMING: 'Errante', TREASURE: 'Tesoro',
    WOLF: 'Lobo', BARREL: 'Barril'
  }
  return map[faction] || faction || 'Desconocida'
}

// ── BOSS ARTICLE ─────────────────────────────────────────────────────────────
// Filter bosses (exclude summons, miniboss helpers, events)
const bosses = allMobs.filter(m => {
  const n = (m['@uniquename'] || '').toLowerCase()
  return n.includes('boss') &&
    !n.includes('summon') &&
    !n.includes('event') &&
    !n.includes('halloween') &&
    !n.includes('chest') &&
    !n.includes('city')
})

// Group by faction
const bossByFaction = {}
bosses.forEach(m => {
  const f = m['@faction'] || 'UNKNOWN'
  if (!bossByFaction[f]) bossByFaction[f] = []
  bossByFaction[f].push(m)
})

const bossLines = ['# Jefes (Bosses) — Albion Online', '', '> Datos extraídos de los archivos del juego. Todos los tiers incluidos.', '']
bossLines.push('Los bosses son mobs de élite que aparecen en dungeons aleatorios y zonas específicas. Dan más fama que los mobs normales y dropean loot de mejor calidad.', '')
bossLines.push('---', '')

Object.entries(bossByFaction).sort((a,b) => b[1].length - a[1].length).forEach(([faction, mobs]) => {
  bossLines.push(`## Facción: ${factionEs(faction)}`, '')
  bossLines.push('| Nombre | Tier | Fama | HP máx |')
  bossLines.push('|--------|------|------|--------|')
  // Group by base name (without tier prefix) and show T4-T8 range
  const byBase = {}
  mobs.forEach(m => {
    const base = m['@uniquename'].replace(/^T\d+_/, '')
    if (!byBase[base]) byBase[base] = []
    byBase[base].push(m)
  })
  Object.entries(byBase).forEach(([base, variants]) => {
    variants.sort((a, b) => parseInt(a['@tier']) - parseInt(b['@tier']))
    const tiers = variants.map(v => v['@tier']).join('/')
    const fame = parseInt(variants[0]['@fame'] || 0)
    const hp = parseInt(variants[0]['@hitpointsmax'] || 0)
    const name = mobDisplayName('T' + variants[0]['@tier'] + '_' + base)
    bossLines.push(`| ${name} | T${tiers} | ${fame.toLocaleString()} | ${hp.toLocaleString()} |`)
  })
  bossLines.push('')
})

fs.writeFileSync(path.join(OUT_DIR, 'mobs-bosses.md'), bossLines.join('\n'))
console.log('Created: mobs-bosses.md')

// ── FACTION DUNGEONS ARTICLE ─────────────────────────────────────────────────
const elites = allMobs.filter(m => {
  const n = (m['@uniquename'] || '').toLowerCase()
  return n.includes('elite') && !n.includes('boss') && !n.includes('summon')
})

const factionGuideLines = ['# Facciones de Mobs — Guía de Dungeons', '', '> Datos extraídos de los archivos del juego.', '']
factionGuideLines.push(`
## Las 5 facciones principales

| Facción | Encontrar en | Tipo de daño principal |
|---------|-------------|------------------------|
| **No-muerto (Undead)** | Zonas black/red (bosques) | Mágico |
| **Hereje (Heretic)** | Dungeons randoms, hell gates | Físico + Mágico |
| **Morgana** | Dungeons randoms, zonas amarillas-negras | Mágico |
| **Keeper** | Zonas verdes-negras (highlands) | Físico |
| **Demonio (Demon)** | Hell gates, corrupted dungeons | Mágico puro |

## Mecánicas por facción

### No-muerto (Undead)
- Uso de habilidades de silencio y DoT mágico
- Los arqueros tienen alcance largo — acercarse primero
- Bosses usan Drain Life (sustain de HP)
- **Drop especial:** Mortifcado y Undead Cape material

### Hereje (Heretic)
- Mezclan daño físico (melee) y mágico (casters)
- Los casters tienen baja defensa física
- Frecuente uso de root y slow
- **Drop especial:** Rogue Hood material, Cleric Robe material

### Morgana
- Casters pesados — alta resistencia mágica pero baja física
- Usan áreas de daño y summoners
- **Drop especial:** Morgana Cape, Morgana Sword material

### Keeper
- Melee con mucho HP y armor
- Uso de buff de daño en rangos medios de HP
- **Drop especial:** Keeper Staff material, Keeper Cape

### Demonio (Demon)
- Puramente mágico — llevar resist mágica
- AoE constante
- Solo se encuentran en Hell Gates y Corrupted Dungeons
- **Drop especial:** Demon Armor material, Demon Cape

## Tipos de Dungeons

| Tipo | Acceso | Facciones | Riesgo |
|------|--------|-----------|--------|
| **Random Dungeon** | Portales en el mapa | Undead/Heretic/Morgana/Keeper | PvP posible en zonas red/black |
| **Static Dungeon** | Ubicaciones fijas | Varía por zona | Siempre PvP |
| **Corrupted Dungeon** | Portales violeta | Corrupted + invasores | PvP garantizado (1v1) |
| **Hell Gate** | Portales rojo oscuro | Demon + otros jugadores | PvP garantizado (5v5) |
| **Mists** | Portales neblina | Varios | Solo/duo, PvP posible |

## Fama por facción (T6, boss)
`.trim())
factionGuideLines.push('')

// Calculate average fame by faction for T6 bosses
const t6Bosses = bosses.filter(m => m['@tier'] === '6' && !m['@uniquename'].includes('EVENT'))
const famByFaction = {}
t6Bosses.forEach(m => {
  const f = m['@faction'] || 'UNK'
  if (!famByFaction[f]) famByFaction[f] = []
  famByFaction[f].push(parseInt(m['@fame'] || 0))
})
factionGuideLines.push('| Facción | Fama promedio T6 Boss |')
factionGuideLines.push('|---------|----------------------|')
Object.entries(famByFaction).sort((a,b) => {
  const avgA = a[1].reduce((x,y)=>x+y,0)/a[1].length
  const avgB = b[1].reduce((x,y)=>x+y,0)/b[1].length
  return avgB - avgA
}).forEach(([faction, fames]) => {
  const avg = Math.round(fames.reduce((x,y)=>x+y,0)/fames.length)
  factionGuideLines.push(`| ${factionEs(faction)} | ${avg.toLocaleString()} |`)
})

fs.writeFileSync(path.join(OUT_DIR, 'dungeons-facciones.md'), factionGuideLines.join('\n'))
console.log('Created: dungeons-facciones.md')

// ── NORMAL MOBS ARTICLE ──────────────────────────────────────────────────────
// T5 mobs by faction for fame farming reference
const t5Mobs = allMobs.filter(m =>
  m['@tier'] === '5' &&
  !m['@uniquename'].includes('EVENT') &&
  !m['@uniquename'].includes('CRITTER') &&
  parseInt(m['@fame'] || 0) > 0
)

const farmLines = ['# Farmeo de Fama — Mobs por Facción', '', '> Datos extraídos de los archivos del juego. Fama de mobs T5.', '']
farmLines.push('El farmeo de fama es la forma principal de subir el Destiny Board en Albion. Los mobs T5 son el punto óptimo de entrada para jugadores con equipo T5-T6.', '')

const t5ByFaction = {}
t5Mobs.forEach(m => {
  const f = m['@faction'] || 'OTHER'
  if (!t5ByFaction[f]) t5ByFaction[f] = []
  t5ByFaction[f].push(m)
})

Object.entries(t5ByFaction).sort((a,b)=>b[1].length-a[1].length).slice(0, 8).forEach(([faction, mobs]) => {
  farmLines.push(`## ${factionEs(faction)}`)
  farmLines.push('')
  farmLines.push('| Mob | Fama | HP |')
  farmLines.push('|-----|------|----|')
  mobs
    .filter(m => parseInt(m['@fame'] || 0) > 500)
    .sort((a,b) => parseInt(b['@fame']||0) - parseInt(a['@fame']||0))
    .slice(0, 10)
    .forEach(m => {
      const name = mobDisplayName(m['@uniquename'])
      const fame = parseInt(m['@fame'] || 0)
      const hp = parseInt(m['@hitpointsmax'] || 0)
      farmLines.push(`| ${name} | ${fame.toLocaleString()} | ${hp.toLocaleString()} |`)
    })
  farmLines.push('')
})

fs.writeFileSync(path.join(OUT_DIR, 'mobs-farmeo-fama.md'), farmLines.join('\n'))
console.log('Created: mobs-farmeo-fama.md')

// ── UPDATE INDEX ─────────────────────────────────────────────────────────────
const indexPath = path.join(OUT_DIR, 'index.json')
const indexEntries = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

const newEntries = [
  { title: 'Jefes (Bosses) — stats y fama por facción', file: 'mobs-bosses.md', keywords: ['boss','jefe','elite','dungeon','fama','fame','hp','faccion','undead','heretic','morgana','keeper','demon'], updated: '2026-08-03' },
  { title: 'Facciones y Dungeons — guía completa', file: 'dungeons-facciones.md', keywords: ['dungeon','faccion','undead','heretic','morgana','keeper','demon','hell gate','corrupted','mists','random','static','pvp'], updated: '2026-08-03' },
  { title: 'Farmeo de fama — mobs por facción T5', file: 'mobs-farmeo-fama.md', keywords: ['farmeo','fama','fame','mob','t5','dungeon','grinding','subir','destiny board','xp'], updated: '2026-08-03' },
]

// Remove old entries with same filenames if any
const cleaned = indexEntries.filter(e => !newEntries.find(n => n.file === e.file))
const updated = [...cleaned, ...newEntries]
fs.writeFileSync(indexPath, JSON.stringify(updated, null, 2))
console.log(`index.json updated: ${updated.length} total articles`)
console.log('DONE!')
