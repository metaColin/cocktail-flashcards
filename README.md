# Cocktail Flashcards

Printable 3x5 in flashcards for every IBA Official Cocktail plus the simple drinks people actually order. Use it at the GitHub Pages URL for this repo, or open `index.html` locally; there is no server and no build step needed to run it. Filter, then hit Export PDF.

## What is on a card

Front: name, ingredients, method, garnish, glass (for non-IBA drinks), category, popularity tier, and a hole-punch guide. Back: name, category, and a QR code to the IBA's video for that drink.

## Data

- `cocktails.json`: the 102 IBA Official Cocktails, scraped from iba-world.com by `scrape.mjs`. Photos in `img/` are the IBA's, included for now and due to be replaced; use the Photos toggle to print without them.
- `supplement.json`: 32 drinks the IBA does not list but a working bar sees constantly: highballs and simple mixed drinks, zero-proof orders, Drinks International top-50 classics missing from the IBA list, and regional specialities. Specs follow the US bartending-school and bar-management standard: a 1.5 oz shot for highballs and single-mixer drinks (one shot and fill, about 1:4), 2 oz for up and stirred drinks, 2 : 3/4 : 3/4 for sours. Every entry carries the references it was checked against and a statement of where the card departs from them; `SOURCES.md` is generated from this, including the pour-standard citations. The reference is also printed on the back of each non-IBA card. There is no canonical body for these drinks, so the cards are working standards with their provenance shown, not canon.
- `popularity.json`: Drinks International's 2026 bestselling-classics poll (about 100 top bars in 30+ countries) and the tier rules. Core = DI top 15 or a US on-premise volume staple per CGA by NIQ, or any simple drink. Common = DI 16-50 or a routine event order. Rare = everything else.

## Units

IBA data is in millilitres and the supplement is in US ounces. The Units switch shows either in the other: ounces round to the nearest 1/8 oz (thirds and 1 tsp = 5 ml recognised), millilitres round to 2.5 ml. Both units are shown to a bartender on a test, so learn the one your bar pours in.

## Build

```
npm install
node scrape.mjs   # refresh the IBA list and photos
node build.mjs    # merge data, assign tiers, generate QR codes -> data.js
./make-pdf.sh front            # headless PDF without the print dialog (macOS; edit CHROME for other OSes)
./make-pdf.sh back
./make-pdf.sh front,nophoto,nopunch
```

## UI shell

The sidebar, drawer, and controls use Bootstrap 5.3 and the Barlow typeface, both vendored under `vendor/` (installed from npm, copied in; no CDN, no third-party requests, works offline). Bootstrap styles only the shell. Cards and the print sheets keep their own CSS in absolute units (5x3 in cards, letter sheets with zero page margin); the on-screen scaling that fits cards to a phone is applied to the browser list only and never to the print tree, so the exported PDF stays 1:1. `index.html` loads local assets with a `?v=N` query; bump it when changing `cards.js`, `card.css`, `print.css`, or `data.js` so browsers do not serve a stale copy.

## Hosting

Static files only. `.nojekyll` tells GitHub Pages to serve the repo as-is. `data.js` is committed so Pages needs no build; rerun `node build.mjs` and commit after editing any JSON.

## Printing

US Letter, portrait, four cards per sheet rotated 90 degrees, crop marks at the corners. Print at 100% scale with no fit-to-page. For double sided, print the back sheets on the reverse with a long-edge flip; the back layout is already mirrored to line up.
