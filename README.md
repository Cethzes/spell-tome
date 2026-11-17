# Spell Tome

A wizard's spellbook for D&D (2024 rules) that runs as a desktop app. There's no window frame or browser around it: the book is the whole app. It opens as a closed leather cover. Click it to open the book, drag page corners to turn pages, and close the book to quit.

Inside:

- **239 wizard spells**, one per page, grouped by level (cantrips through 9th). Each page lists casting time, range, components, duration and a short summary.
- **Contents page** with a search box and filters for school, concentration, ritual and your prepared spells.
- **Wizard's Ledger** for your character: level, Intelligence, armour class, hit points, hit dice, death saves, and concentration. Spell save DC and attack bonus are worked out for you.
- **Spell Slots page** with tap-to-spend slots, Arcane Recovery, a long-rest button, and your class features for your level.
- **Prepared Spells page**: mark spells as prepared (or cantrips as known), and the book tracks them against your limit.
- **Ribbon bookmarks** down the side to jump to any level, the ledger or the contents. The last ribbon (✕) closes the book.

Everything works offline, and your character and prepared spells are saved between sessions.

## Requirements

- **Windows 10 or 11** with the Microsoft Edge WebView2 runtime. Windows 11 includes it. On Windows 10, get it from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/) if the app doesn't open.
- **[Node.js](https://nodejs.org)** (current LTS) and npm, to set up and build the app.

The app is built with [Neutralinojs](https://neutralino.js.org), which also targets macOS and Linux. Only Windows has been tested.

## Install

```sh
git clone https://github.com/Cethzes/spell-tome.git
cd spell-tome
npm install
npm run setup
```

`npm run setup` downloads the Neutralino runtime into `bin/`. You only need to run it once.

## Run

**Build the app:**

```sh
npm run build
```

This creates a single file, `dist/spell-tome/spell-tome-win_x64.exe` (about 3 MB). Double-click it to open the book. You can copy the exe anywhere, since everything it needs is inside it.

**Run from source while making changes:**

```sh
npm start
```

This opens the book straight from the `www/` folder, without building an exe.

### Using the book

| To | Do this |
|---|---|
| Open the book | Click the cover, or press → |
| Turn pages | Drag a page corner, or press ← / → |
| Search or filter | Use the Contents page (the ❦ ribbon) |
| Jump to a level | Click its ribbon (C, 1–9) |
| Move the window | Drag the leather border around the pages |
| Quit | Click the ✕ ribbon. The book closes, then the app exits. |

Your data is stored in `%APPDATA%\spell-tome-win_x64.exe\`. It's tied to the exe's file name, so renaming the exe starts a fresh book.

## Customising

All the app's files are in `www/`:

| File | What it holds |
|---|---|
| `data/spells.json` | The spell list. Add, remove or edit spells here. |
| `data/wizard.json` | Spell slots, prepared-spell counts and class features for each level |
| `cover.svg` | The front cover art. It's a plain SVG, so you can edit it in Inkscape or a text editor. Delete it to get a plain text title instead. |
| `styles.css` | Colours, fonts and layout. The leather and parchment colours are at the top. |
| `app.js` | Everything the app does |

Window size, title and the local port (47219) are in `neutralino.config.json`. If another program already uses that port, change it there and rebuild. Changing the port also starts a fresh book, because saved data is tied to it.

## Credits and licences

- [Neutralinojs](https://neutralino.js.org): MIT
- [jQuery](https://jquery.com): MIT
- [turn.js](https://github.com/blasten/turn.js) 3rd release, by Emmanuel Garcia: **personal, non-commercial use only** (see `www/vendor/turn.js-LICENSE.txt`). Because of this, you can't sell this app or use it to make money. The bundled copy is patched to use pointer events; the change is marked at the top of the file.
- Fonts: [IM Fell English](https://fonts.google.com/specimen/IM+Fell+English) and [EB Garamond](https://fonts.google.com/specimen/EB+Garamond), under the SIL Open Font License

Spell summaries are short paraphrases for use at the table, not the published rules text. This is an unofficial fan project, not affiliated with Wizards of the Coast. Dungeons & Dragons is their trademark.
