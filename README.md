# Bookmark Speed Dial

A Firefox extension that replaces the new tab page with visual tiles from a chosen bookmarks folder — similar to Safari's Favorites.

## Features

- Displays bookmarks from any folder as a grid of icon tiles
- Favicons fetched automatically; falls back to a colored letter tile
- Dark mode support
- Folder can be changed at any time

## Installation

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on…**
3. Select `manifest.json` from this directory

For permanent installation, the extension needs to be signed by Mozilla. See [Firefox Add-on Distribution](https://extensionworkshop.com/documentation/publish/).

## Usage

- **First run:** a folder picker appears — select which bookmarks folder to display.
- **Change folder:** hover over the folder name at the top of the page and click the ⚙ icon that appears, or click the folder name itself.
- **Close the picker:** press `Escape`, click outside the panel, or click `×`.

## Structure

```
manifest.json   — extension manifest (MV3)
newtab.html     — new tab page markup
newtab.css      — styles
newtab.js       — bookmarks loading, tile rendering, folder picker
```
