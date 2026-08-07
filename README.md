# Add to Navidrome userscript

A small userscript that adds the current track to a private Navidrome library from:

- YouTube
- YouTube Music
- SoundCloud track pages
- SoundCloud's persistent bottom player

The button adopts each site's native controls. On SoundCloud's bottom player it uses SoundCloud's own button classes, including the native unchanged background on hover.

## Install

1. Install Tampermonkey or Violentmonkey.
2. In Chrome 138 or newer, right-click Tampermonkey, choose **Manage extension**, and enable **Allow User Scripts**. On older Chrome versions, enable **Developer mode** on `chrome://extensions` instead.
3. Open the [userscript install URL](https://raw.githubusercontent.com/rakkateichou/navidrome-userscript/master/navidrome.user.js).
4. Confirm the installation and make sure **Add to Navidrome** is enabled in the userscript manager.
5. Refresh YouTube or SoundCloud, then click the music-note button.
6. Enter the server URL and browser access token when prompted.

The token is saved only in the userscript manager's private storage. It is not included in this repository or in the update file. Settings can be reopened from the userscript manager menu as **Configure Navidrome connection**.

If the button never appears, first recheck **Allow User Scripts** and that the script itself is enabled. Chrome does not run any Tampermonkey userscripts until that extra permission is granted.

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
