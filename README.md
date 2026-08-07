# Add to Navidrome userscript

A small userscript that adds the current track to a private Navidrome library from:

- YouTube
- YouTube Music
- SoundCloud track pages
- SoundCloud's persistent bottom player

The button adopts each site's native controls. On SoundCloud's bottom player it uses SoundCloud's own button classes, including the native unchanged background on hover.

## Install

1. Install Tampermonkey or Violentmonkey.
2. Open the [userscript install URL](https://raw.githubusercontent.com/rakkateichou/navidrome-userscript/master/navidrome.user.js).
3. Confirm the installation in the userscript manager.
4. Click the music-note button on YouTube or SoundCloud.
5. Enter the server URL and browser access token when prompted.

The token is saved only in the userscript manager's private storage. It is not included in this repository or in the update file. Settings can be reopened from the userscript manager menu as **Configure Navidrome connection**.

## Security

The source code is public, but access to the Navidrome library is not. Every API request requires the private bearer token configured on the server through `BROWSER_EXTENSION_TOKEN`. Requests without the correct token are rejected, and the token is never committed to this repository or embedded in the distributed userscript.

Anyone can inspect or install the userscript, but only someone who knows that private token can add tracks to this Navidrome server. If the token is ever exposed, rotate `BROWSER_EXTENSION_TOKEN` on the server and update it from **Configure Navidrome connection**.

## Updates

Tampermonkey and Violentmonkey use the script's `@version`, `@updateURL`, and `@downloadURL` metadata to install new versions. Increment `@version` for every release.

Updates are fetched directly from the public repository's raw `navidrome.user.js` file.

## Development

```powershell
npm install
npm test
npm run check
npm run format:check
```
