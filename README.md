# Add to Navidrome userscript

A small userscript that adds the current track to a private Navidrome library from:

- YouTube
- YouTube Music
- SoundCloud track pages
- SoundCloud's persistent bottom player

The button adopts each site's native controls. On SoundCloud's bottom player it uses SoundCloud's own button classes, including the native unchanged background on hover.

## Install

1. Install Tampermonkey or Violentmonkey on Chrome, or [Userscripts](https://github.com/quoid/userscripts) on Safari.
2. On Chrome 138 or newer, right-click Tampermonkey, choose **Manage extension**, and enable **Allow User Scripts**. On older Chrome versions, enable **Developer mode** on `chrome://extensions` instead.
3. Open the [userscript install URL](https://raw.githubusercontent.com/rakkateichou/navidrome-userscript/master/navidrome.user.js).
4. Confirm the installation and make sure **Add to Navidrome** is enabled in the userscript manager.
5. Refresh YouTube or SoundCloud, then click the music-note button.
6. Enter the server URL and browser access token when prompted.

The token is saved only in the userscript manager's private storage. It is not included in this repository or in the update file. Settings can be reopened from the userscript manager menu as **Configure Navidrome connection**. If the manager has no script menu, press and hold the music-note button on touch devices or right-click it on desktop.

### Safari setup

In Safari's extension settings, give Userscripts access to YouTube, YouTube Music, and SoundCloud (or choose **Always Allow on Every Website**). Open the install URL above, then open the Userscripts toolbar popup to install or refresh the script. Reload the music site afterward.

Userscripts for Safari does not expose the per-script menu used by Tampermonkey. Before a token is saved, this script therefore shows a **Set up Navidrome** button in the lower-right corner of supported sites, and the site control uses a settings icon. Saving the connection does not add the currently open track. After setup, press and hold or right-click the site's Navidrome music-note button whenever you need to change the connection.

If the button never appears, first recheck **Allow User Scripts** and that the script itself is enabled. Chrome does not run any Tampermonkey userscripts until that extra permission is granted.

The script requests an isolated DOM sandbox so YouTube's page-level Trusted Types policy cannot block construction of the injected controls.
It also constructs every injected element through DOM APIs without assigning HTML strings, which keeps the controls compatible if a userscript manager falls back to page context.

## Security

The source code is public, but access to the Navidrome library is not. Every API request requires the private bearer token configured on the server through `BROWSER_EXTENSION_TOKEN`. Requests without the correct token are rejected, and the token is never committed to this repository or embedded in the distributed userscript.

Anyone can inspect or install the userscript, but only someone who knows that private token can add tracks to this Navidrome server. If the token is ever exposed, rotate `BROWSER_EXTENSION_TOKEN` on the server and update it from **Configure Navidrome connection**.

## Updates

Tampermonkey, Violentmonkey, and Userscripts use the script's `@version`, `@updateURL`, and `@downloadURL` metadata to install new versions. Increment `@version` for every release.

Updates are fetched directly from the public repository's raw `navidrome.user.js` file.

## Development

```powershell
npm install
npm test
npm run check
npm run format:check
```
