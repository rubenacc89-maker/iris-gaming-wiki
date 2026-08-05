/**
 * build_lol_wiki.js — League of Legends wiki generator for Iris
 * node build_lol_wiki.js <VERSION> <WIKI_DIR>
 * Uses Riot Data Dragon API (es_MX locale)
 */
const fs   = require('fs')
const path = require('path')
const https = require('https')

const VERSION  = process.argv[2]
const WIKI_DIR = process.argv[3]
const OUT_DIR  = path.join(WIKI_DIR, 'games', 'league-of-legends')
const BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/es_MX`

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'iris-wiki-bot' } }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch(e) { reject(e) } })
    }).on('error', reject)
  })
}

// ── ROLE CLASSIFICATION ──────────────────────────────────────────────────────
// Manual role assignments for accuracy (Data Dragon tags alone don't cover lanes)
const ROLE_MAP = {
  top:     ['Aatrox','Ambessa','Camille','Cho\'Gath','Darius','Dr. Mundo','Fiora','Gangplank','Garen','Gnar','Gragas','Gwen','Heimerdinger','Illaoi','Irelia','Jax','Jayce','Kayle','Kennen','Kled','Malphite','Maokai','Mordekaiser','Nasus','Olaf','Ornn','Pantheon','Poppy','Quinn','Renekton','Riven','Rumble','Ryze','Sett','Shen','Singed','Sion','Teemo','Trundle','Tryndamere','Urgot','Vayne','Volibear','Wukong','Yasuo','Yone','Yorick','Zac','Nunu y Willump'],
  jungle:  ['Amumu','Bel\'Veth','Briar','Diana','Ekko','Elise','Evelynn','Fiddlesticks','Gragas','Graves','Gwen','Hecarim','Ivern','Jarvan IV','Jax','Kayn','Kha\'Zix','Kindred','Lee Sin','Lillia','Master Yi','Nidalee','Nocturne','Nunu y Willump','Olaf','Pantheon','Poppy','Rammus','Rek\'Sai','Rengar','Sejuani','Shaco','Shyvana','Skarner','Taliyah','Talon','Trundle','Udyr','Vi','Viego','Volibear','Warwick','Wukong','Xin Zhao','Zac','Zed'],
  mid:     ['Ahri','Akali','Anivia','Annie','Aurelion Sol','Aurora','Azir','Cassiopeia','Corki','Diana','Ekko','Fizz','Galio','Heimerdinger','Irelia','Jayce','Kassadin','Katarina','Leblanc','Lissandra','Lux','Malzahar','Naafiri','Neeko','Orianna','Pantheon','Qiyana','Ryze','Seraphine','Sylas','Syndra','Taliyah','Talon','Twisted Fate','Veigar','Vel\'Koz','Viktor','Vladimir','Vex','Xerath','Yasuo','Yone','Zed','Zoe','Ziggs','Zyra'],
  adc:     ['Aphelios','Ashe','Caitlyn','Corki','Draven','Ezreal','Graves','Jhin','Jinx','Kai\'Sa','Kalista','Kog\'Maw','Lucian','Mel','Miss Fortune','Nilah','Samira','Senna','Sivir','Smolder','Tristana','Twitch','Varus','Vayne','Xayah','Zeri'],
  support: ['Alistar','Bard','Blitzcrank','Brand','Braum','Galio','Karma','Leona','Lulu','Lux','Milio','Morgana','Nami','Nautilus','Neeko','Pyke','Rakan','Renata Glasc','Senna','Seraphine','Sona','Soraka','Swain','Tahm Kench','Taric','Thresh','Vel\'Koz','Xerath','Yuumi','Zilean','Zyra','Janna']
}

const ROLE_META = {
  top:     { title: 'Campeones Top',     slug: 'campeones-top',     tags: ['top','top lane','toplaner','tanque top','bruiser','split push','duelo','1v1'] },
  jungle:  { title: 'Campeones Jungla',  slug: 'campeones-jungle',  tags: ['jungla','jungle','jungler','gankear','gank','smite','campamentos','dragon','baron','objetivos'] },
  mid:     { title: 'Campeones Mid',     slug: 'campeones-mid',     tags: ['mid','mid lane','midlaner','mago','carry mid','roaming','roam'] },
  adc:     { title: 'Campeones ADC',     slug: 'campeones-adc',     tags: ['adc','bot','bot lane','tirador','marksman','carry','ad carry','dps','físico'] },
  support: { title: 'Campeones Support', slug: 'campeones-support', tags: ['support','soporte','supp','encadenador','healer','shield','engager','mago support'] },
}

// ── ITEM CATEGORIES ──────────────────────────────────────────────────────────
const ITEM_CATS = {
  dano:     { title: 'Items de Daño Físico',  slug: 'items-dano',     tags: ['item daño','daño físico','ad','brutalidad','letal','critical','crítico','ataque','asesino'] },
  magico:   { title: 'Items de Daño Mágico',  slug: 'items-magico',   tags: ['item mago','poder de habilidad','ap','magia','mágico','mago','abismo','luden'] },
  tanque:   { title: 'Items de Tanque',       slug: 'items-tanque',   tags: ['item tanque','armadura','resistencia mágica','vida','hp','tanque','mr','armor'] },
  utilidad: { title: 'Items de Utilidad',     slug: 'items-utilidad', tags: ['bota','botas','velocidad de movimiento','utilidad','maná','cooldown','habilidad reducción'] },
}

// ── GENERATE CHAMPION ARTICLES ───────────────────────────────────────────────
async function buildChampionArticles(allChampions) {
  const indexEntries = []

  for (const [role, meta] of Object.entries(ROLE_META)) {
    const roleChamps = ROLE_MAP[role] || []
    const matched = roleChamps.filter(name => allChampions[name])
    const lines = [`# ${meta.title} — League of Legends`, '', '> Datos extraídos de Data Dragon (Riot Games).', '']

    for (const champName of matched) {
      const c = allChampions[champName]
      if (!c) continue
      const rolesLabel = c.tags.join(' / ')
      lines.push(`## ${c.name}`)
      lines.push(`*${rolesLabel}* — ${c.title}`, '')
      lines.push(c.blurb.replace(/\n/g, ' '), '')
      lines.push(`**Estadísticas base:** HP ${c.stats.hp} | Armadura ${c.stats.armor} | Res. Mágica ${c.stats.spellblock} | Daño ataque ${c.stats.attackdamage}`, '')
      lines.push('---', '')
    }

    const content = lines.join('\n')
    const filename = meta.slug + '.md'
    fs.writeFileSync(path.join(OUT_DIR, filename), content)

    const keywords = [
      ...meta.tags,
      ...matched.map(n => n.toLowerCase()),
      'campeón','champion','habilidades','build','lane'
    ]
    indexEntries.push({ title: `${meta.title} — lista y stats base`, file: filename, keywords, updated: new Date().toISOString().split('T')[0] })
    console.log(`  ${filename}: ${matched.length} campeones`)
  }

  return indexEntries
}

// ── GENERATE RUNES ARTICLE ───────────────────────────────────────────────────
async function buildRunesArticle(runesData) {
  const lines = [
    '# Runas — League of Legends',
    '',
    'Las runas son mejoras pasivas que elegís antes de cada partida. Elegís una runa **principal** (keystones + 2 menores del mismo árbol) y un árbol **secundario** (2 menores de otro árbol).',
    '',
    '---',
    ''
  ]

  for (const tree of runesData) {
    lines.push(`## ${tree.name}`, '')
    lines.push(`**Keystones (runa principal):** ${tree.slots[0].runes.map(r => r.name).join(', ')}`, '')

    tree.slots[0].runes.forEach(r => {
      lines.push(`### ${r.name}`)
      lines.push(r.shortDesc.replace(/<[^>]+>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'), '')
    })

    lines.push('**Runas menores:**')
    tree.slots.slice(1).forEach((slot, i) => {
      const names = slot.runes.map(r => r.name).join(' / ')
      lines.push(`- Fila ${i + 2}: ${names}`)
    })
    lines.push('', '---', '')
  }

  fs.writeFileSync(path.join(OUT_DIR, 'runas.md'), lines.join('\n'))

  const allRuneNames = runesData.flatMap(t => t.slots.flatMap(s => s.runes.map(r => r.name.toLowerCase())))
  const treeNames   = runesData.map(t => t.name.toLowerCase())

  return {
    title: 'Runas — todos los árboles y keystones',
    file: 'runas.md',
    keywords: [...treeNames, ...allRuneNames.slice(0, 30), 'runa','keystone','árbol de runas','runa principal','runa secundaria','electrocutar','conquistador','cosecha oscura','aumento glacial','primer golpe'],
    updated: new Date().toISOString().split('T')[0]
  }
}

// ── GENERATE ITEMS ARTICLES ──────────────────────────────────────────────────
async function buildItemsArticles(itemsData) {
  const items = Object.values(itemsData.data).filter(item =>
    item.gold?.purchasable &&
    item.gold?.total >= 1000 &&
    !item.consumed &&
    item.maps?.['11'] &&
    item.depth >= 2
  )

  const adItems   = items.filter(i => (i.stats?.FlatPhysicalDamageMod || 0) >= 20 || (i.tags||[]).includes('Damage'))
  const apItems   = items.filter(i => (i.stats?.FlatMagicDamageMod || 0) >= 40 || (i.tags||[]).includes('SpellDamage'))
  const tankItems = items.filter(i => ((i.stats?.FlatHPPoolMod || 0) >= 200 || (i.stats?.FlatArmorMod || 0) >= 30 || (i.stats?.FlatSpellBlockMod || 0) >= 30) && !adItems.includes(i) && !apItems.includes(i))
  const utilItems = items.filter(i => (i.tags||[]).some(t => ['Boots','ManaRegen','CooldownReduction','Mana'].includes(t)))

  const groups = [
    { meta: ITEM_CATS.dano,     list: adItems.slice(0, 25) },
    { meta: ITEM_CATS.magico,   list: apItems.slice(0, 25) },
    { meta: ITEM_CATS.tanque,   list: tankItems.slice(0, 25) },
    { meta: ITEM_CATS.utilidad, list: utilItems.slice(0, 20) },
  ]

  const indexEntries = []

  for (const { meta, list } of groups) {
    const lines = [`# ${meta.title} — League of Legends`, '', '> Datos extraídos de Data Dragon (Riot Games).', '']

    list.forEach(item => {
      const desc = (item.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g,' ').trim().slice(0, 200)
      const stats = Object.entries(item.stats || {}).map(([k, v]) => {
        const labels = { FlatPhysicalDamageMod:'AD', FlatMagicDamageMod:'AP', FlatHPPoolMod:'Vida', FlatArmorMod:'Armadura', FlatSpellBlockMod:'Res. Mágica', PercentAttackSpeedMod:'Vel. Ataque', FlatMovementSpeedMod:'Vel. Movimiento' }
        return labels[k] ? `${labels[k]}: ${Math.round(typeof v === 'number' && v < 1 ? v * 100 : v)}` : null
      }).filter(Boolean).join(' | ')

      lines.push(`## ${item.name}`)
      lines.push(`**Coste:** ${item.gold.total} oro${stats ? ` | ${stats}` : ''}`)
      if (desc) lines.push(desc)
      lines.push('')
    })

    const filename = meta.slug + '.md'
    fs.writeFileSync(path.join(OUT_DIR, filename), lines.join('\n'))

    const itemNames = list.map(i => i.name.toLowerCase())
    indexEntries.push({
      title: `${meta.title} — coste y stats`,
      file: filename,
      keywords: [...meta.tags, ...itemNames.slice(0, 20), 'item','objeto','comprar','build','gold','oro'],
      updated: new Date().toISOString().split('T')[0]
    })
    console.log(`  ${filename}: ${list.length} items`)
  }

  return indexEntries
}

// ── MANUAL ARTICLES ──────────────────────────────────────────────────────────
function buildMecanicasArticle() {
  const content = `# Mecánicas básicas — League of Legends

Conceptos fundamentales para entender y mejorar en LoL.

---

## CS (Creep Score / Súbditos)

El CS es la cantidad de súbditos que matás con el último golpe. Es la principal fuente de oro del juego.

- **Buen CS:** 7-8 por minuto (70-80 a los 10 min)
- **Excelente CS:** 9-10 por minuto (90-100 a los 10 min)
- Cada súbdito de melé da ~21 oro, de rango ~14 oro
- **Tip:** Priorizá CS antes que trades en laning phase

---

## Objetivos y Épicos

| Objetivo | Reaparición | Recompensa |
|---|---|---|
| Dragón Elemental | 5 min | Buff de elemento según tipo |
| Alma del Dragón | 4 dragones | Buff permanente poderoso |
| Dragón Anciano | 6 min (después del alma) | Burn sobre enemigos |
| Barón Nashor | 20 min | Buff de Barón al equipo |
| Heraldo del Vacío | 8-19:45 min | Item para romper torres |
| Torre | — | 150-400 oro + presión de mapa |

## Tipos de Dragón

- **Infernal:** Daño aumentado
- **Montaña:** Resistencias aumentadas
- **Océano:** Regeneración de vida y maná
- **Nube:** Velocidad de movimiento
- **Hextech:** Aceleración de habilidades y ataque
- **Quimiotécnico:** Daño verdadero al Barón y Dragón
- **Tierra:** Retrasa regeneración de recursos al enemigo

---

## Fases del Juego

**Laning phase (0-14 min):** CS, controlar el mazo de súbditos, ward, evitar morir.

**Mid game (14-25 min):** Rotaciones, objetivos en grupo, torres de primera y segunda.

**Late game (25+ min):** Peleas de equipo, Baron, Elder Dragon, Nexus.

---

## Visión (Wards)

- **Ward de trinquete:** Gratis, 120s CD, dura 90s
- **Ward de control:** 75 oro, permanente hasta ser destruida, revela invisibles
- **Ward de visión:** Item consumible, dura 150s
- **Regla básica:** Siempre tener al menos 1 ward de control en el inventario

---

## Daño Verdadero vs Mágico vs Físico

- **Físico:** Reducido por Armadura → counter: penetración de armadura
- **Mágico:** Reducido por Resistencia Mágica → counter: penetración mágica
- **Verdadero:** Ignora todas las resistencias — no tiene counter

---

## Roles y Responsabilidades

| Rol | Objetivo principal |
|---|---|
| Top | Aguantar solo, crear presión de split push |
| Jungla | Control de objetivos, gankear, ritmo del juego |
| Mid | Roaming, ayudar otras líneas, controlar el mapa |
| ADC | Sobrevivir laning, hacer daño sostenido en teamfights |
| Support | Proteger al ADC, visión del mapa, iniciar peleas |
`

  fs.writeFileSync(path.join(OUT_DIR, 'mecanicas.md'), content)
  return {
    title: 'Mecánicas básicas — CS, objetivos, dragons, visión',
    file: 'mecanicas.md',
    keywords: ['cs','creep score','súbdito','farm','dragón','dragon','barón','baron','nashor','heraldo','torre','nexo','wards','visión','ward de control','laning phase','mid game','late game','daño verdadero','armadura','resistencia mágica','fases del juego','objetivo','épico'],
    updated: new Date().toISOString().split('T')[0]
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Building LoL wiki — Data Dragon ${VERSION} (es_MX)`)

  console.log('\nDownloading champion data...')
  const champSummary = await fetchJson(`${BASE_URL}/champion.json`)
  const allChampions = champSummary.data

  console.log('Downloading rune data...')
  const runesData = await fetchJson(`${BASE_URL}/runesReforged.json`)

  console.log('Downloading item data...')
  const itemsData = await fetchJson(`${BASE_URL}/item.json`)

  console.log(`\nTotal champions: ${Object.keys(allChampions).length}`)

  const indexEntries = []

  console.log('\nBuilding champion articles...')
  const champEntries = await buildChampionArticles(allChampions)
  indexEntries.push(...champEntries)

  console.log('Building runes article...')
  const runesEntry = await buildRunesArticle(runesData)
  indexEntries.push(runesEntry)
  console.log('  runas.md: OK')

  console.log('Building item articles...')
  const itemEntries = await buildItemsArticles(itemsData)
  indexEntries.push(...itemEntries)

  console.log('Building mecanicas article...')
  const mecEntry = buildMecanicasArticle()
  indexEntries.push(mecEntry)
  console.log('  mecanicas.md: OK')

  // Save index
  const existingIndex = fs.existsSync(path.join(OUT_DIR, 'index.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'index.json'), 'utf8'))
    : []

  // Preserve manual articles not generated by this script
  const AUTO_FILES = new Set(indexEntries.map(e => e.file))
  const preserved = existingIndex.filter(e => !AUTO_FILES.has(e.file))
  const finalIndex = [...preserved, ...indexEntries]

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(finalIndex, null, 2))
  console.log(`\nindex.json: ${finalIndex.length} total articles`)

  // Update source.json with current version
  const sourcePath = path.join(OUT_DIR, 'source.json')
  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  sourceData.data_sources[0].last_version = VERSION
  sourceData.data_sources[0].last_checked = new Date().toISOString().split('T')[0]
  sourceData.last_updated = new Date().toISOString().split('T')[0]
  fs.writeFileSync(sourcePath, JSON.stringify(sourceData, null, 2))

  console.log('ALL DONE!')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
