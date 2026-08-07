# Add to Navidrome userscript

A small userscript that adds the current track to a private Navidrome library from:

- YouTube
- YouTube Music
- SoundCloud track pages
- SoundCloud's persistent bottom player

The button adopts each site's native controls. On SoundCloud's bottom player it uses SoundCloud's own button classes, including the native unchanged background on hover.

## Install

1. Install Tampermonkey or Violentmonkey.
2. Open the [userscript install URL](https://gist.githubusercontent.com/rakkateichou/36726799658f15dcb156c80fdd0d3183/raw/navidrome.user.js).
3. Confirm the installation in the userscript manager.
4. Click the music-note button on YouTube or SoundCloud.
5. Enter the server URL and browser access token when prompted.

The token is saved only in the userscript manager's private storage. It is not included in this repository or in the update feed. Settings can be reopened from the userscript manager menu as **Configure Navidrome connection**.

## Updates

The source repository is private. Userscript managers cannot authenticate to GitHub's private raw-file endpoints during background update checks, so releases are mirrored to an unlisted GitHub Gist with no credentials or secrets in it.

Tampermonkey and Violentmonkey use the script's `@version`, `@updateURL`, and `@downloadURL` metadata to install new versions. Increment `@version` for every release.

This checkout uses the committed `.githooks/pre-push` hook to mirror `navidrome.user.js` to the update feed before each push:

```powershell
git config core.hooksPath .githooks
```

You can also publish it explicitly:

```powershell
npm run publish-feed
```

## Development

```powershell
npm install
npm test
npm run check
npm run format:check
```
