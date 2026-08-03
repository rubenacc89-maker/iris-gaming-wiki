# Cómo contribuir a la Iris Gaming Wiki

## Estructura

Cada juego tiene su carpeta en `games/nombre-del-juego/` con:
- `index.json` — índice de artículos con keywords para búsqueda
- Un `.md` por tema

## Agregar un artículo nuevo

1. Fork este repositorio
2. Creá el archivo `.md` en la carpeta del juego correspondiente
3. Agregá la entrada en el `index.json` del juego con title, file y keywords
4. Abrí un Pull Request con una descripción clara de qué agregaste

## Agregar un juego nuevo

1. Creá la carpeta `games/nombre-del-juego/`
2. Creá el `index.json` dentro con el primer artículo
3. Agregá el juego a `games.json` en la raíz
4. Abrí un Pull Request

## Reglas de contenido

- Solo información verificada y probada
- Indicá la versión o fecha del parche si aplica
- Sin spoilers de historia sin aviso previo
- No copies texto de otras wikis con copyright
- Sé específico — Iris usa esto para responder preguntas concretas

## Formato del index.json

```json
{
  "title": "Título descriptivo del artículo",
  "file": "nombre-archivo.md",
  "keywords": ["palabra1", "palabra2", "término específico del juego"],
  "updated": "YYYY-MM-DD"
}
```

Los keywords son lo más importante — determinan si Iris encuentra el artículo.
Poné entre 5 y 15 keywords específicos del tema.
