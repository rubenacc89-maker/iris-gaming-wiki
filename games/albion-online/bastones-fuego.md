# Bastones de Fuego en Albion Online — tipos y habilidades

> Datos extraídos directamente de los archivos del juego (ao-bin-dumps). Valores exactos, sin estimaciones.

Existen **5 tipos** de bastones de fuego. Tres son de una mano (1H) y dos son de dos manos (2H).

---

## Bastones de una mano (1H)

### Bastón de Fuego — Fire Staff
**Habilidad E: Pyroblast**
- **Mecánica:** Canal de carga × 3 pulsos (1 cada 0.6s) → lanza un proyectil de fuego teledirigido
- **Cooldown:** 15 segundos
- **Alcance:** 15m
- **Nota:** El proyectil escala con las 3 cargas acumuladas durante el canal. Se interrumpe con daño (disruptionfactor activo).

---

### Bastón Keeper — Keeper Staff
**Habilidad E: Esfera de Magma (Magmasphere)**
- **Mecánica:** Proyectil de área — al impactar aplica:
  - -240 daño mágico instantáneo
  - DoT: 3% de HP máximo × 4 ticks × cada 1s = **12% HP total** (ignora armadura)
- **Cooldown:** 30 segundos
- **Alcance:** 25m (el mayor de los bastones 1H)
- **Casteo:** 0.6 segundos
- **Importante:** El DoT solo afecta jugadores — no funciona en mobs

---

### Bastón de Cristal — Crystal Staff
**Habilidad E: Flame Dash**
- **Mecánica:** Dash instantáneo hacia el objetivo que otorga:
  - 0.75s de invencibilidad total (inmunidad a daño)
  - 0.75s de inmunidad a spells
  - Aura de 3m durante el dash: -21 daño mágico × 3 ticks = **-63 daño total** a enemigos que atravesés
- **Cooldown:** 40 segundos
- **Alcance:** 14m
- **Uso principal:** Escape, reposicionamiento, sobrevivir bursts.

---

## Bastones de dos manos (2H)

### Bastón de Fuego 2H — Great Fire Staff
**Habilidad E: Pilar de Llamas (Flamepillar)**
- **Mecánica:** Columna de fuego instantánea en área
  - -200 daño mágico en radio **4m**
  - **Si golpea:** resetea al 100% el cooldown de esta misma habilidad E
- **Cooldown:** 15 segundos (o 0s si golpea — spam infinito mientras haya objetivos)
- **Alcance:** 15m
- **Uso principal:** ZvZ y farming de grupos grandes. Si hay 5+ enemigos en una zona, el E casi nunca tiene CD.

---

### Bastón del Infierno — Infernal Staff
**Habilidad E: Meteoro (Meteor)**
- **Mecánica:** Meteorito que cae en área tras 2s de casteo
  - -434 daño mágico en radio **5m** (+8% por objetivo extra)
  - Knockback de 3m desde el punto de impacto
- **Cooldown:** 30 segundos
- **Alcance:** 15m
- **Casteo:** 2 segundos (predecible, pero el daño más alto del grupo)
- **Uso principal:** Burst de grupo, ZvZ, emboscadas donde el enemigo no puede moverse.

---

## Comparativa rápida

| Bastón | E | Daño | CD | Alcance | Tipo |
|--------|---|------|----|---------|------|
| Fire Staff | Pyroblast | Variable (canal) | 15s | 15m | 1H |
| Keeper Staff | Magmasphere | -240 + 12% HP | 30s | 25m | 1H |
| Crystal Staff | Flame Dash | -63 (dash) | 40s | 14m | 1H |
| Great Fire Staff | Flamepillar | -200 AoE 4m | 15s/0s* | 15m | 2H |
| Infernal Staff | Meteor | -434 AoE 5m | 30s | 15m | 2H |

*El CD del Flamepillar se resetea si golpea

---

## ¿Cuál elegir según el rol?

- **PvE solo / dungeons:** Keeper Staff — el DoT 12% HP destruye tanques y elites
- **ZvZ / grupal:** Infernal Staff o Great Fire Staff — AoE masivo
- **Ganking / PvP agresivo:** Infernal Staff — el Meteor en 5m con knockback
- **Escape o 1v1:** Crystal Staff — el Flame Dash es el mejor escape del grupo
- **Farming eficiente:** Great Fire Staff — Flamepillar spam infinito si hay grupos

---

## Notas de balanceo

- Todos los bastones de fuego tienen `targetcountvaluebonusfactor: 0.08` = **+8% daño por objetivo extra** en habilidades de área
- El Magmasphere DoT es inmune a armadura y solo aplica a jugadores — diseñado para PvP anti-tank
- Crystal Staff puede ser 1H + offhand = más flexibilidad de build que los 2H
