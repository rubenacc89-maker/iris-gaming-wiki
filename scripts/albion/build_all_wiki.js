/**
 * build_all_wiki.js — Full Albion Online wiki generator for Iris
 * node build_all_wiki.js <SCRATCHPAD> <WIKI_DIR>
 */
const fs = require('fs')
const path = require('path')
const SCRATCHPAD = process.argv[2]
const WIKI_DIR = process.argv[3]
const OUT_DIR = path.join(WIKI_DIR, 'games', 'albion-online')

// ── LOAD DATA ────────────────────────────────────────────────────────────────
console.log('Loading game files...')
const itemsRaw = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'items_full.json'), 'utf8'))
const spellsRaw = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'spells_full.json'), 'utf8'))
const localeRaw = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'localization.json'), 'utf8'))

const allSpells = spellsRaw.spells.activespell || []
const allItems = itemsRaw.items

// ── LOCALE MAP ───────────────────────────────────────────────────────────────
console.log('Building locale map...')
const locale = {}
;(localeRaw.tmx.body.tu || []).forEach(entry => {
  const key = entry['@tuid']; if (!key) return
  const tuv = entry.tuv
  let text = null
  if (Array.isArray(tuv)) { const en = tuv.find(t => t['@xml:lang'] === 'EN-US'); text = en ? en.seg : tuv[0]?.seg }
  else text = tuv?.seg
  if (text) locale[key] = (typeof text === 'string' ? text : String(text)).replace(/\[[^\]]+\]/g, '').replace(/\$+[^$\s,]+\$/g, '?').trim()
})
console.log('Locale entries:', Object.keys(locale).length)

function loc(key) {
  if (!key) return null
  return locale[key] || locale['@' + key] || null
}

// ── INDEXES ──────────────────────────────────────────────────────────────────
const spellMap = {}
allSpells.forEach(s => { if (s['@uniquename']) spellMap[s['@uniquename']] = s })

const weaponArr = Array.isArray(allItems.weapon) ? allItems.weapon : (allItems.weapon ? [allItems.weapon] : [])
const weaponMap = {}
weaponArr.forEach(w => { weaponMap[w['@uniquename']] = w })

const equipArr = Array.isArray(allItems.equipmentitem) ? allItems.equipmentitem : (allItems.equipmentitem ? [allItems.equipmentitem] : [])
const equipMap = {}
equipArr.forEach(e => { equipMap[e['@uniquename']] = e })

// combined map for reference resolution
const itemMap = { ...weaponMap, ...equipMap }

// ── SPELL UTILITIES ──────────────────────────────────────────────────────────
function spellName(id) {
  if (!id) return ''
  const s = spellMap[id]
  // 1. Try @namelocatag from spell definition
  if (s && s['@namelocatag']) {
    const n = loc(s['@namelocatag'])
    if (n && n.length > 1 && !n.includes('$')) return n
  }
  // 2. Try @SPELLS_<ID> pattern
  const byId = loc('@SPELLS_' + id)
  if (byId && byId.length > 1 && !byId.includes('$')) return byId
  // 3. Try without trailing digits (e.g. HEROICSTRIKE2 -> HEROICSTRIKE)
  const stripped = id.replace(/\d+$/, '')
  if (stripped !== id) {
    const byStripped = loc('@SPELLS_' + stripped)
    if (byStripped && byStripped.length > 1 && !byStripped.includes('$')) return byStripped
  }
  // 4. Prettify internal name
  return id.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function spellInfo(id) {
  const s = spellMap[id]; if (!s) return null
  const cd = parseFloat(s['@recastdelay'] || 0)
  const range = parseFloat(s['@castrange'] || 0)
  const castTime = parseFloat(s['@castingtime'] || 0)
  let dmg = null
  if (s.directattributechange) {
    const dac = Array.isArray(s.directattributechange) ? s.directattributechange[0] : s.directattributechange
    const c = Math.round(parseFloat(dac['@change'] || 0))
    if (c !== 0) dmg = { change: c, type: dac['@effecttype'] || '', radius: parseFloat(dac['@effectarearadius'] || 0) }
  }
  let dot = null
  if (s.attributechangeovertime) {
    const aot = Array.isArray(s.attributechangeovertime) ? s.attributechangeovertime[0] : s.attributechangeovertime
    const c = parseFloat(aot['@change'] || 0)
    const count = parseInt(aot['@count'] || 0)
    dot = { change: c, count, isRelative: aot['@changetype'] === 'relativemax', interval: parseFloat(aot['@interval'] || 1) }
  }
  return { id, displayName: spellName(id), cd, range, castTime, dmg, dot, uitype: s['@uitype'], category: s['@category'] }
}

function dmgStr(spell) {
  if (!spell) return ''
  const parts = []
  if (spell.dmg) {
    const t = spell.dmg.type === 'magic' ? 'mágico' : spell.dmg.type === 'physical' ? 'físico' : spell.dmg.type
    const r = spell.dmg.radius > 0 ? ` AoE ${spell.dmg.radius}m` : ''
    parts.push(`${spell.dmg.change > 0 ? '+' : ''}${spell.dmg.change} daño ${t}${r}`)
  }
  if (spell.dot) {
    if (spell.dot.isRelative) parts.push(`${(spell.dot.change*100*spell.dot.count).toFixed(0)}% HP DoT`)
    else { const t = Math.abs(Math.round(spell.dot.change * spell.dot.count)); if (t > 0) parts.push(`${t} DoT`) }
  }
  return parts.join(' + ')
}

function fmtSpell(spell) {
  if (!spell) return ''
  const cd = spell.cd > 0 ? `CD ${spell.cd}s` : 'sin CD'
  const r = spell.range > 0 ? `, ${spell.range}m` : ''
  const ct = spell.castTime > 0 ? `, cast ${spell.castTime}s` : ''
  const d = dmgStr(spell); const ds = d ? ` — ${d}` : ''
  return `**${spell.displayName}** (${cd}${r}${ct})${ds}`
}

// ── RESOLVE SPELLS (HANDLES @reference INHERITANCE) ──────────────────────────
function resolveSpells(id, depth) {
  depth = depth || 0; if (depth > 6) return []
  const item = itemMap[id]; if (!item || !item.craftingspelllist) return []
  const csl = item.craftingspelllist
  let base = csl['@reference'] ? resolveSpells(csl['@reference'], depth + 1) : []
  const own = Array.isArray(csl.craftspell) ? csl.craftspell : (csl.craftspell ? [csl.craftspell] : [])
  const rm = new Set((Array.isArray(csl.removespell) ? csl.removespell : (csl.removespell ? [csl.removespell] : [])).map(r => r['@uniquename']))
  base = base.filter(cs => !rm.has(cs['@uniquename']))
  own.forEach(cs => { if (!rm.has(cs['@uniquename'])) base.push(cs) })
  return base
}

function weaponSpells(id) {
  const all = resolveSpells(id)
  return {
    q: all.filter(cs => cs['@slots'] === '1').map(cs => spellInfo(cs['@uniquename'])).filter(Boolean),
    w: all.filter(cs => cs['@slots'] === '2').map(cs => spellInfo(cs['@uniquename'])).filter(Boolean),
    e: all.filter(cs => cs['@slots'] === '3').map(cs => spellInfo(cs['@uniquename'])).filter(Boolean),
  }
}

function armorSpells(id) {
  const all = resolveSpells(id)
  const actives = all.filter(cs => !cs['@uniquename'].startsWith('PASSIVE_')).map(cs => spellInfo(cs['@uniquename'])).filter(Boolean)
  const passives = all.filter(cs => cs['@uniquename'].startsWith('PASSIVE_')).map(cs => {
    const n = spellName(cs['@uniquename']); return n
  })
  return { actives, passives }
}

// ── ITEM DISPLAY NAME ────────────────────────────────────────────────────────
function itemName(id) {
  const item = itemMap[id]
  if (item) {
    // Try @ITEMS_<ID_WITHOUT_TIER>
    const stripped = id.replace(/^T\d+_/, '')
    const tries = [
      item['@namelocatag'],
      item['@descriptionlocatag'],
      '@ITEMS_' + stripped,
      '@ITEMS_T4_' + stripped,
    ]
    for (const key of tries) {
      if (!key) continue
      const n = loc(key)
      if (n && n.length > 1 && !n.includes('$') && !n.includes('Lvl') && n.length < 80) return n
    }
  }
  // Prettify internal ID
  return id.replace(/^T\d+_/, '').replace(/^(2H_|MAIN_|1H_)/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ── WEAPON ARTICLES ──────────────────────────────────────────────────────────
const WEAPON_CATS = {
  sword:        { title: 'Espadas',                  tags: ['espada','sword','claymore','dualsword','melee'] },
  dagger:       { title: 'Dagas',                    tags: ['daga','dagger','garras','claw','melee','ganking'] },
  axe:          { title: 'Hachas',                   tags: ['hacha','axe','alabarda','halberd','melee'] },
  hammer:       { title: 'Martillos',                tags: ['martillo','hammer','polehammer','melee','zvz'] },
  mace:         { title: 'Mazas',                    tags: ['maza','mace','mangual','flail','melee','cc'] },
  spear:        { title: 'Lanzas',                   tags: ['lanza','spear','glaive','melee','movilidad'] },
  quarterstaff: { title: 'Bastones de Cuarto',       tags: ['quarterstaff','bastón de cuarto','melee'] },
  knuckles:     { title: 'Puños',                    tags: ['puños','knuckles','gauntlets','melee','burst'] },
  bow:          { title: 'Arcos',                    tags: ['arco','bow','warbow','longbow','distancia'] },
  crossbow:     { title: 'Ballestas',                tags: ['ballesta','crossbow','distancia','zvz'] },
  firestaff:    { title: 'Bastones de Fuego',        tags: ['fuego','fire','firestaff','pyroblast','meteor','mago'] },
  froststaff:   { title: 'Bastones de Hielo',        tags: ['hielo','frost','froststaff','glacial','mago','slow'] },
  cursestaff:   { title: 'Bastones Malditos',        tags: ['maldito','curse','cursestaff','demonic','dot','mago'] },
  holystaff:    { title: 'Bastones Sagrados',        tags: ['sagrado','holy','holystaff','divine','healer','curar'] },
  naturestaff:  { title: 'Bastones de Naturaleza',   tags: ['naturaleza','nature','naturestaff','wild','healer'] },
  arcanestaff:  { title: 'Bastones Arcanos',         tags: ['arcano','arcane','arcanestaff','enigmatic','mago'] },
}

function makeWeaponArticle(cat, weapons) {
  const meta = WEAPON_CATS[cat] || { title: cat, tags: [] }
  const lines = [`# ${meta.title} — Albion Online`, '', '> Datos extraídos de los archivos del juego.', '']
  weapons.forEach(w => {
    const hand = w.twohanded ? '2H' : '1H'
    lines.push(`## ${itemName(w.id)} (${hand})`, '')
    if (w.q.length) { lines.push('**Q:**'); w.q.forEach(s => lines.push(`- ${fmtSpell(s)}`)); lines.push('') }
    if (w.w.length) { lines.push('**W (elegís uno):**'); w.w.forEach(s => lines.push(`- ${fmtSpell(s)}`)); lines.push('') }
    if (w.e.length) { lines.push('**E — definitiva:**'); w.e.forEach(s => lines.push(`- ${fmtSpell(s)}`)); lines.push('') }
    lines.push('---', '')
  })
  return lines.join('\n')
}

// ── ARMOR ARTICLES ───────────────────────────────────────────────────────────
const ARMOR_SLOTS = {
  head:    { title: 'Cascos',         tags: ['casco','helmet','cabeza','head','armadura'] },
  armor:   { title: 'Pecheras',       tags: ['pecho','chest','armadura','torso','pechera'] },
  shoes:   { title: 'Botas',          tags: ['botas','shoes','pies','boots','armadura'] },
  offhand: { title: 'Offhand',        tags: ['offhand','escudo','shield','libro','book','antorcha','torch','secundario'] },
  cape:    { title: 'Capas',          tags: ['capa','cape','accesorio'] },
}

function armorType(id) {
  const n = id.toLowerCase()
  if (n.includes('_plate')) return 'Placa (Tanque)'
  if (n.includes('_leather')) return 'Cuero (DPS físico)'
  if (n.includes('_cloth')) return 'Tela (Mago/Healer)'
  if (n.includes('_gatherer')) return 'Recolector'
  return 'General'
}

function makeArmorArticle(slotKey, items) {
  const meta = ARMOR_SLOTS[slotKey] || { title: slotKey, tags: [] }
  const lines = [`# ${meta.title} — Albion Online`, '', '> Datos extraídos de los archivos del juego.', '', '**Q** = primera habilidad activa | **W** = segunda | **E** = definitiva', '']

  // Group by armor type
  const grouped = {}
  items.forEach(item => {
    const type = armorType(item.id)
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(item)
  })

  Object.entries(grouped).forEach(([type, typeItems]) => {
    lines.push(`## ${type}`, '')
    typeItems.forEach(item => {
      lines.push(`### ${itemName(item.id)}`)
      if (item.actives.length > 0) {
        lines.push('**Habilidades activas:**')
        item.actives.forEach((s, i) => {
          const slot = i === 0 ? 'Q' : i === 1 ? 'W' : 'E'
          lines.push(`- **[${slot}]** ${fmtSpell(s)}`)
        })
      }
      if (item.passives.length > 0) {
        lines.push(`**Pasivas:** ${item.passives.join(', ')}`)
      }
      lines.push('')
    })
    lines.push('---', '')
  })
  return lines.join('\n')
}

// ── BUILD EVERYTHING ─────────────────────────────────────────────────────────
const existingIndex = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'index.json'), 'utf8'))
const indexEntries = existingIndex.filter(e =>
  !e.file.startsWith('armas-') &&
  !e.file.startsWith('armaduras-') &&
  e.file !== 'bastones-fuego.md' &&
  e.file !== 'monturas.md' &&
  e.file !== 'consumibles.md'
)

// 1. Weapons
console.log('\nBuilding weapon articles...')
const combatWeapons = weaponArr.filter(w =>
  parseInt(w['@activespellslots']) > 0 &&
  w['@tier'] === '4' &&
  w['@shopcategory'] !== 'gathering' &&
  !w['@uniquename'].startsWith('UNIQUE_')
)
const weaponByCat = {}
combatWeapons.forEach(w => {
  const cat = w['@shopsubcategory1'] || 'other'
  if (!weaponByCat[cat]) weaponByCat[cat] = []
  const s = weaponSpells(w['@uniquename'])
  weaponByCat[cat].push({ id: w['@uniquename'], twohanded: w['@twohanded'] === 'true', ...s })
})
Object.entries(weaponByCat).forEach(([cat, weps]) => {
  if (!WEAPON_CATS[cat]) return
  const meta = WEAPON_CATS[cat]
  const slug = 'armas-' + cat
  fs.writeFileSync(path.join(OUT_DIR, slug + '.md'), makeWeaponArticle(cat, weps))
  indexEntries.push({ title: `${meta.title} — habilidades Q/W/E`, file: slug + '.md', keywords: [...meta.tags, 'arma','habilidad','Q','W','E','definitiva'], updated: '2026-08-03' })
  process.stdout.write('.')
})
console.log(' ' + Object.keys(weaponByCat).filter(c => WEAPON_CATS[c]).length + ' articles')

// 2. Armor
console.log('Building armor articles...')
const armorByCat = { head: [], armor: [], shoes: [], offhand: [], cape: [] }
equipArr.filter(e =>
  e['@tier'] === '4' &&
  !e['@uniquename'].startsWith('UNIQUE_') &&
  armorByCat.hasOwnProperty(e['@slottype'])
).forEach(item => {
  const { actives, passives } = armorSpells(item['@uniquename'])
  if (actives.length === 0 && passives.length === 0) return
  armorByCat[item['@slottype']].push({ id: item['@uniquename'], actives, passives })
})
Object.entries(armorByCat).forEach(([slot, items]) => {
  if (items.length === 0) return
  const meta = ARMOR_SLOTS[slot]
  const slug = 'armaduras-' + slot
  fs.writeFileSync(path.join(OUT_DIR, slug + '.md'), makeArmorArticle(slot, items))
  indexEntries.push({ title: `${meta.title} — habilidades activas y pasivas`, file: slug + '.md', keywords: [...meta.tags, 'habilidad','armadura','pasiva','activa','slot'], updated: '2026-08-03' })
  console.log(`  ${slug}.md: ${items.length} items`)
})

// 3. Mounts
console.log('Building mounts article...')
const mountArr2 = Array.isArray(allItems.mount) ? allItems.mount : (allItems.mount ? [allItems.mount] : [])
const mounts = mountArr2.filter(m => m['@tier'] === '4' && !m['@uniquename'].startsWith('UNIQUE_'))
if (mounts.length > 0) {
  const lines = ['# Monturas — Albion Online', '', '> Datos extraídos de los archivos del juego.', '']
  const mountByCat = {}
  mounts.forEach(m => {
    const c = m['@shopsubcategory1'] || 'other'
    if (!mountByCat[c]) mountByCat[c] = []
    mountByCat[c].push(m)
  })
  Object.entries(mountByCat).forEach(([cat, ms]) => {
    lines.push(`## ${cat.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`, '')
    ms.forEach(m => {
      const n = itemName(m['@uniquename'])
      const speed = m['@movespeed'] || '?'
      const sprint = m['@sprintspeed'] ? `, sprint: ${m['@sprintspeed']}` : ''
      const hp = m['@hitpointsmax'] ? `, HP: ${m['@hitpointsmax']}` : ''
      const inventory = m['@inventoryslots'] ? `, slots: ${m['@inventoryslots']}` : ''
      lines.push(`- **${n}** — velocidad: ${speed}${sprint}${hp}${inventory}`)
    })
    lines.push('')
  })
  fs.writeFileSync(path.join(OUT_DIR, 'monturas.md'), lines.join('\n'))
  indexEntries.push({ title: 'Monturas — tipos, velocidad y stats', file: 'monturas.md', keywords: ['montura','mount','caballo','ox','buey','direwolf','velocidad','speed','transporte','battle mount','combat mount'], updated: '2026-08-03' })
  console.log(`  monturas.md: ${mounts.length} mounts`)
}

// 4. Food & potions (from consumableitem)
console.log('Building consumables article...')
const consArr = Array.isArray(allItems.consumableitem) ? allItems.consumableitem : []
const t4cons = consArr.filter(c => c['@tier'] === '4' && !c['@uniquename'].startsWith('UNIQUE_'))
if (t4cons.length > 0) {
  const lines = ['# Comida y Pociones — Albion Online', '', '> Datos extraídos de los archivos del juego.', '']
  const consByCat = {}
  t4cons.forEach(c => {
    const cat = c['@shopsubcategory1'] || c['@shopcategory'] || 'other'
    if (!consByCat[cat]) consByCat[cat] = []
    consByCat[cat].push(c)
  })
  Object.entries(consByCat).forEach(([cat, items]) => {
    lines.push(`## ${cat.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`, '')
    items.forEach(item => {
      const n = itemName(item['@uniquename'])
      const nut = item['@nutrition'] ? ` — Nutrición: ${item['@nutrition']}` : ''
      lines.push(`- **${n}**${nut}`)
    })
    lines.push('')
  })
  fs.writeFileSync(path.join(OUT_DIR, 'consumibles.md'), lines.join('\n'))
  indexEntries.push({ title: 'Comida y consumibles — tipos y efectos', file: 'consumibles.md', keywords: ['comida','food','consumible','consumable','nutricion','buff','pez','fish'], updated: '2026-08-03' })
  console.log(`  consumibles.md: ${t4cons.length} items`)
}

// Save index
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(indexEntries, null, 2))
console.log(`\nindex.json: ${indexEntries.length} total articles`)
console.log('ALL DONE!')
