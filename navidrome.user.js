// ==UserScript==
// @name         Add to Navidrome
// @namespace    https://github.com/rakkateichou/navidrome-userscript
// @version      1.2.0
// @description  Add the current YouTube, YouTube Music, or SoundCloud track to Navidrome.
// @author       rakkateichou
// @homepageURL  https://github.com/rakkateichou/navidrome-userscript
// @supportURL   https://github.com/rakkateichou/navidrome-userscript/issues
// @updateURL    https://raw.githubusercontent.com/rakkateichou/navidrome-userscript/master/navidrome.user.js
// @downloadURL  https://raw.githubusercontent.com/rakkateichou/navidrome-userscript/master/navidrome.user.js
// @match        https://youtu.be/*
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @match        https://soundcloud.com/*
// @match        https://www.soundcloud.com/*
// @connect      bot.music.rkde.su
// @run-at       document-idle
// @sandbox      DOM
// @inject-into  content
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// ==/UserScript==

(function () {
  "use strict";

  const DEFAULT_SERVER_URL = "https://bot.music.rkde.su";
  const BUTTON_CONTAINER_ID = "navidrome-userscript-add-container";
  const SETTINGS_DIALOG_ID = "navidrome-userscript-settings";
  const CONFIG_KEY = "navidromeConfig";
  const TRACK_STATES_KEY = "navidromeTrackStates";
  const POLL_INTERVAL_MS = 2500;
  const TERMINAL_STATE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  const STYLES = `
    #${BUTTON_CONTAINER_ID} {
      align-items: center;
      align-self: center;
      contain: layout style;
      display: inline-flex;
      flex: 0 0 40px !important;
      height: 40px !important;
      inline-size: 40px !important;
      margin-right: 8px;
      max-inline-size: 40px !important;
      max-width: 40px !important;
      min-inline-size: 40px !important;
      min-width: 40px !important;
      width: 40px !important;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] {
      margin: 0;
      vertical-align: middle;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="youtube-music"] {
      margin: 0;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="youtube"] {
      align-items: flex-start;
      height: 44px !important;
      margin: 0 0 0 8px;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud-player"] {
      flex-basis: 40px !important;
      height: 28px !important;
      margin: 0 8px 0 0;
    }

    #${BUTTON_CONTAINER_ID}.navidrome-add-fallback {
      bottom: 24px;
      margin: 0;
      position: fixed;
      right: 24px;
      z-index: 2147483646;
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud-player) {
      align-items: center;
      appearance: none;
      background: transparent;
      border: 0;
      border-radius: 50%;
      box-sizing: border-box;
      box-shadow: none;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      flex: 0 0 40px !important;
      height: 40px !important;
      justify-content: center;
      max-height: 40px !important;
      max-width: 40px !important;
      min-height: 40px !important;
      min-width: 40px !important;
      padding: 0;
      transition: background-color 140ms ease;
      width: 40px !important;
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud-player):hover:not(:disabled) {
      background: rgb(127 127 127 / 16%);
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud-player):active:not(:disabled) {
      background: rgb(127 127 127 / 24%);
    }

    .navidrome-add-button:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }

    .navidrome-add-button:disabled {
      cursor: default;
      opacity: 0.84;
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud-player)[data-status="success"],
    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud-player)[data-status="error"] {
      background: transparent;
      color: inherit;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] .navidrome-add-button {
      background: transparent;
      border: 1px solid rgb(255 255 255 / 38%);
      color: inherit;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] .navidrome-add-button:hover:not(:disabled) {
      background: rgb(255 255 255 / 10%);
      border-color: rgb(255 255 255 / 55%);
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud-player"] .navidrome-add-native-soundcloud-player {
      height: 28px !important;
      margin: 0 !important;
      max-height: 28px !important;
      min-height: 28px !important;
      width: 40px !important;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud-player"] .navidrome-add-icon {
      height: 16px;
      width: 16px;
    }

    .navidrome-add-icon {
      fill: currentcolor;
      flex: 0 0 auto;
      height: 20px;
      width: 20px;
    }

    .navidrome-add-native-youtube .navidrome-add-icon {
      display: inherit;
      height: 24px;
      pointer-events: none;
      width: 24px;
    }

    .navidrome-add-check {
      display: none;
    }

    .navidrome-add-button[data-status="success"] .navidrome-add-note,
    .navidrome-add-button[data-status="success"] .navidrome-add-plus {
      display: none;
    }

    .navidrome-add-button[data-status="success"] .navidrome-add-check {
      display: block;
    }

    .navidrome-add-loading .navidrome-add-icon {
      animation: navidrome-icon-pulse 900ms ease-in-out infinite alternate;
    }

    .navidrome-add-label {
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      height: 1px;
      overflow: hidden;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    #${SETTINGS_DIALOG_ID} {
      background: #181818;
      border: 1px solid rgb(255 255 255 / 16%);
      border-radius: 16px;
      box-shadow: 0 20px 70px rgb(0 0 0 / 55%);
      color: #f1f1f1;
      font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: auto;
      max-width: min(420px, calc(100vw - 32px));
      padding: 0;
      width: 100%;
      z-index: 2147483647;
    }

    #${SETTINGS_DIALOG_ID}::backdrop {
      background: rgb(0 0 0 / 64%);
      backdrop-filter: blur(5px);
    }

    #${SETTINGS_DIALOG_ID} form {
      display: grid;
      gap: 16px;
      padding: 22px;
    }

    #${SETTINGS_DIALOG_ID} h2,
    #${SETTINGS_DIALOG_ID} p {
      margin: 0;
    }

    #${SETTINGS_DIALOG_ID} h2 {
      font-size: 19px;
      line-height: 1.2;
    }

    #${SETTINGS_DIALOG_ID} p {
      color: #aaa;
    }

    #${SETTINGS_DIALOG_ID} label {
      display: grid;
      gap: 7px;
    }

    #${SETTINGS_DIALOG_ID} input {
      background: #252525;
      border: 1px solid #444;
      border-radius: 9px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      min-width: 0;
      outline: 0;
      padding: 10px 12px;
      width: 100%;
    }

    #${SETTINGS_DIALOG_ID} input:focus {
      border-color: #888;
      box-shadow: 0 0 0 3px rgb(255 255 255 / 8%);
    }

    #${SETTINGS_DIALOG_ID} .navidrome-settings-status {
      color: #ff8b8b;
      min-height: 20px;
    }

    #${SETTINGS_DIALOG_ID} .navidrome-settings-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    #${SETTINGS_DIALOG_ID} button {
      appearance: none;
      background: #333;
      border: 0;
      border-radius: 999px;
      color: #fff;
      cursor: pointer;
      font: 600 14px/1 system-ui, sans-serif;
      padding: 11px 16px;
    }

    #${SETTINGS_DIALOG_ID} button[type="submit"] {
      background: #f1f1f1;
      color: #171717;
    }

    #${SETTINGS_DIALOG_ID} button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    @keyframes navidrome-icon-pulse {
      from { opacity: 0.45; transform: scale(0.88); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 600px) {
      #${BUTTON_CONTAINER_ID}.navidrome-add-fallback {
        bottom: 16px;
        right: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .navidrome-add-button,
      .navidrome-add-loading .navidrome-add-icon {
        animation: none;
        transition: none;
      }
    }
  `;

  class UserscriptError extends Error {
    constructor(message, code = "REQUEST_FAILED") {
      super(message);
      this.code = code;
    }
  }

  let currentTrack = null;
  let currentState = null;
  let pollTimer = null;
  let refreshQueued = false;

  function cleanServerUrl(value) {
    const url = new URL(value || DEFAULT_SERVER_URL);
    const localHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localHttp) {
      throw new Error("Use HTTPS, or HTTP only for a local server.");
    }
    return url.origin;
  }

  function soundcloudTrackUrl(value, origin) {
    const url = new URL(value, origin || window.location.origin);
    let parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "n") {
      parts = parts.slice(1);
    }
    const reserved = new Set([
      "charts",
      "discover",
      "feed",
      "messages",
      "pages",
      "search",
      "stream",
      "upload",
      "you",
    ]);
    if (parts.length < 2 || reserved.has(parts[0]) || parts.includes("sets")) {
      return null;
    }
    return `${url.origin}/${parts.join("/")}`;
  }

  function currentTrackInfo() {
    const url = new URL(window.location.href);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be" || hostname.endsWith(".youtube.com")) {
      const provider =
        hostname === "music.youtube.com" ? "youtube-music" : "youtube";
      if (url.pathname === "/watch" && url.searchParams.get("v")) {
        return {
          provider,
          url: `${url.origin}/watch?v=${encodeURIComponent(url.searchParams.get("v"))}`,
        };
      }
      const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) {
        return {
          provider,
          url: `${url.origin}/shorts/${encodeURIComponent(shortsMatch[1])}`,
        };
      }
      return null;
    }

    if (hostname === "soundcloud.com" || hostname.endsWith(".soundcloud.com")) {
      if (window.top === window) {
        const playerTrackLink = document.querySelector(
          ".playControls.m-visible .playbackSoundBadge__titleLink[href]",
        );
        const playerTrackUrl = playerTrackLink
          ? soundcloudTrackUrl(
              playerTrackLink.getAttribute("href"),
              window.location.origin,
            )
          : null;
        if (playerTrackUrl) {
          return { provider: "soundcloud-player", url: playerTrackUrl };
        }
      }

      if (
        window.top === window &&
        document.querySelector('iframe.webiIframe[src*="/n/"]')
      ) {
        return null;
      }

      const trackUrl = soundcloudTrackUrl(url.href, url.origin);
      if (trackUrl) {
        return { provider: "soundcloud", url: trackUrl };
      }
    }
    return null;
  }

  function insertionTarget(provider) {
    let selectors;
    if (provider === "soundcloud-player") {
      selectors = [".playControls.m-visible .playbackSoundBadge__actions"];
    } else if (provider === "youtube-music") {
      selectors = [
        "ytmusic-player-bar #right-controls",
        "ytmusic-player-page #top-level-buttons",
      ];
    } else if (provider === "youtube") {
      selectors = [
        "ytd-watch-metadata #top-level-buttons-computed",
        "ytd-menu-renderer #top-level-buttons-computed",
      ];
    } else {
      const shareButton = document.querySelector('button[aria-label="Share"]');
      const modernActionRow = shareButton?.parentElement?.parentElement;
      if (
        modernActionRow?.querySelector(
          'button[aria-label="Copy link"], button[aria-label="More menu"]',
        )
      ) {
        return modernActionRow;
      }
      selectors = [
        ".soundActions .sc-button-group",
        ".soundActions",
        ".listenEngagement__actions",
      ];
    }
    return selectors
      .map((selector) => document.querySelector(selector))
      .find(Boolean);
  }

  function buttonMarkup() {
    return `
      <svg class="navidrome-add-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path class="navidrome-add-note" d="M12 3v11.2a3.7 3.7 0 1 0 2 3.3V8h5V3h-7Z"></path>
        <path class="navidrome-add-plus" d="M5.5 3v2.5H3v2h2.5V10h2V7.5H10v-2H7.5V3h-2Z"></path>
        <path class="navidrome-add-check" d="m9.2 19-5.8-5.8 1.8-1.8 4 4 9.6-9.6 1.8 1.8Z"></path>
      </svg>
      <span class="navidrome-add-label">Add to Navidrome</span>
    `;
  }

  function visibleYoutubeMoreButton() {
    return Array.from(
      document.querySelectorAll(
        'ytd-watch-metadata button[aria-label="More actions"]',
      ),
    ).find((button) => button.getBoundingClientRect().width > 0);
  }

  function soundcloudPlayerReferenceButton() {
    return document.querySelector(
      ".playControls.m-visible .playbackSoundBadge__actions button.sc-button-secondary",
    );
  }

  function createNavidromeButton(
    provider,
    youtubeMoreButton,
    soundcloudReferenceButton,
  ) {
    let button;
    if (provider === "youtube" && youtubeMoreButton) {
      button = youtubeMoreButton.cloneNode(true);
      button.classList.add(
        "navidrome-add-button",
        "navidrome-add-native-youtube",
      );
      const nativeIcon = button.querySelector(".ytSpecButtonShapeNextIcon");
      if (nativeIcon) {
        nativeIcon.innerHTML = buttonMarkup();
      } else {
        button.innerHTML = buttonMarkup();
      }
      button.removeAttribute("aria-expanded");
      button.removeAttribute("aria-haspopup");
      button.removeAttribute("aria-pressed");
    } else if (provider === "soundcloud-player" && soundcloudReferenceButton) {
      button = soundcloudReferenceButton.cloneNode(false);
      button.classList.remove(
        "playbackSoundBadge__like",
        "playbackSoundBadge__follow",
        "sc-button-like",
        "sc-button-follow",
        "sc-button-selected",
        "sc-mr-1x",
        "m-boldIcon",
      );
      button.classList.add(
        "navidrome-add-button",
        "navidrome-add-native-soundcloud-player",
      );
      button.removeAttribute("aria-describedby");
      button.innerHTML = `<div>${buttonMarkup()}</div>`;
    } else {
      button = document.createElement("button");
      button.className = "navidrome-add-button";
      button.innerHTML = buttonMarkup();
    }
    button.type = "button";
    button.addEventListener("click", addCurrentTrack);
    return button;
  }

  function ensureButton() {
    if (!currentTrack) {
      document.getElementById(BUTTON_CONTAINER_ID)?.remove();
      return;
    }

    const youtubeMoreButton =
      currentTrack.provider === "youtube" ? visibleYoutubeMoreButton() : null;
    const soundcloudReferenceButton =
      currentTrack.provider === "soundcloud-player"
        ? soundcloudPlayerReferenceButton()
        : null;
    let container = document.getElementById(BUTTON_CONTAINER_ID);
    const existingButton = container?.querySelector("button");
    const needsYoutubeNative =
      youtubeMoreButton &&
      !existingButton?.classList.contains("navidrome-add-native-youtube");
    const needsSoundcloudNative =
      soundcloudReferenceButton &&
      !existingButton?.classList.contains(
        "navidrome-add-native-soundcloud-player",
      );
    const hasWrongNativeButton =
      (currentTrack.provider !== "youtube" &&
        existingButton?.classList.contains("navidrome-add-native-youtube")) ||
      (currentTrack.provider !== "soundcloud-player" &&
        existingButton?.classList.contains(
          "navidrome-add-native-soundcloud-player",
        ));
    if (
      container &&
      (needsYoutubeNative || needsSoundcloudNative || hasWrongNativeButton)
    ) {
      container.remove();
      container = null;
    }
    if (!container) {
      container = document.createElement("div");
      container.id = BUTTON_CONTAINER_ID;
      container.dataset.provider = currentTrack.provider;
      container.append(
        createNavidromeButton(
          currentTrack.provider,
          youtubeMoreButton,
          soundcloudReferenceButton,
        ),
      );
    }

    container.dataset.provider = currentTrack.provider;
    const moreWrapper = youtubeMoreButton?.parentElement;
    const youtubeTarget = moreWrapper?.parentElement;
    const target = insertionTarget(currentTrack.provider);
    if (youtubeTarget) {
      container.classList.remove("navidrome-add-fallback");
      if (
        container.parentElement !== youtubeTarget ||
        container.nextElementSibling !== moreWrapper
      ) {
        youtubeTarget.insertBefore(container, moreWrapper);
      }
    } else if (target) {
      container.classList.remove("navidrome-add-fallback");
      if (container.parentElement !== target) {
        target.prepend(container);
      }
    } else if (document.body) {
      container.classList.add("navidrome-add-fallback");
      if (container.parentElement !== document.body) {
        document.body.append(container);
      }
    }
    renderState();
  }

  function renderState() {
    const button = document.querySelector(`#${BUTTON_CONTAINER_ID} button`);
    if (!button) return;

    const label = button.querySelector(".navidrome-add-label");
    const status = currentState?.status || "idle";
    button.dataset.status = status;
    button.classList.toggle(
      "navidrome-add-loading",
      ["starting", "queued", "running"].includes(status),
    );
    button.disabled = ["starting", "queued", "running", "success"].includes(
      status,
    );
    let text = "Add to Navidrome";
    let title = "";

    if (status === "starting") {
      text = "Adding…";
    } else if (status === "queued") {
      text = "Queued…";
    } else if (status === "running") {
      text = currentState.message || "Adding…";
    } else if (status === "success") {
      text = "Added to Navidrome";
    } else if (status === "error") {
      text = "Try adding again";
      title = currentState.error || "The track could not be added.";
    }
    title ||= text;
    if (label && label.textContent !== text) {
      label.textContent = text;
    }
    if (button.title !== title) {
      button.title = title;
    }
    const accessibleLabel = status === "error" ? `${text}. ${title}` : text;
    if (button.getAttribute("aria-label") !== accessibleLabel) {
      button.setAttribute("aria-label", accessibleLabel);
    }
    managePolling();
  }

  async function gmGetValue(key, fallback) {
    return Promise.resolve(GM_getValue(key, fallback));
  }

  async function gmSetValue(key, value) {
    return Promise.resolve(GM_setValue(key, value));
  }

  async function getConfig() {
    const stored = (await gmGetValue(CONFIG_KEY, {})) || {};
    return {
      serverUrl: cleanServerUrl(stored.serverUrl || DEFAULT_SERVER_URL),
      token: String(stored.token || "").trim(),
    };
  }

  function requestWithConfig(path, options, config) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: options.method || "GET",
        url: new URL(path, config.serverUrl).toString(),
        data: options.body,
        headers: {
          authorization: `Bearer ${config.token}`,
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.headers || {}),
        },
        timeout: 30000,
        onload(response) {
          let payload = null;
          try {
            payload = JSON.parse(response.responseText);
          } catch {
            // The HTTP status message is more useful than a parse error.
          }
          if (response.status < 200 || response.status >= 300) {
            const detail = payload?.detail;
            reject(
              new UserscriptError(
                typeof detail === "string"
                  ? detail
                  : `Navidrome server returned ${response.status || "an error"}.`,
                response.status === 401 ? "AUTH_FAILED" : "REQUEST_FAILED",
              ),
            );
            return;
          }
          resolve(payload);
        },
        onerror() {
          reject(
            new UserscriptError(
              "Could not reach the Navidrome server.",
              "NETWORK_ERROR",
            ),
          );
        },
        ontimeout() {
          reject(
            new UserscriptError(
              "The Navidrome server took too long to respond.",
              "NETWORK_ERROR",
            ),
          );
        },
      });
    });
  }

  async function requestApi(path, options = {}) {
    const config = await getConfig();
    if (!config.token) {
      throw new UserscriptError(
        "Set the userscript access token first.",
        "CONFIG_REQUIRED",
      );
    }
    return requestWithConfig(path, options, config);
  }

  async function openSettings() {
    const existing = document.getElementById(SETTINGS_DIALOG_ID);
    if (existing) {
      existing.showModal();
      return null;
    }

    const current = await getConfig();
    const dialog = document.createElement("dialog");
    dialog.id = SETTINGS_DIALOG_ID;
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Connect to Navidrome</h2>
        <p>The access token stays in your userscript manager's private storage.</p>
        <label>
          Server URL
          <input name="serverUrl" type="url" autocomplete="url" required>
        </label>
        <label>
          Access token
          <input name="token" type="password" autocomplete="off" minlength="32" required>
        </label>
        <div class="navidrome-settings-status" role="status"></div>
        <div class="navidrome-settings-actions">
          <button value="cancel" type="button">Cancel</button>
          <button type="submit">Test and save</button>
        </div>
      </form>
    `;
    document.body.append(dialog);

    const form = dialog.querySelector("form");
    const serverInput = form.elements.serverUrl;
    const tokenInput = form.elements.token;
    const status = dialog.querySelector(".navidrome-settings-status");
    const cancelButton = dialog.querySelector('button[value="cancel"]');
    const submitButton = dialog.querySelector('button[type="submit"]');
    serverInput.value = current.serverUrl;
    tokenInput.value = current.token;

    return new Promise((resolve) => {
      function close(result) {
        dialog.close();
        dialog.remove();
        resolve(result);
      }

      cancelButton.addEventListener("click", () => close(null));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        close(null);
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.textContent = "";
        submitButton.disabled = true;
        submitButton.textContent = "Connecting…";
        try {
          const config = {
            serverUrl: cleanServerUrl(serverInput.value.trim()),
            token: tokenInput.value.trim(),
          };
          if (config.token.length < 32) {
            throw new Error("The access token must be at least 32 characters.");
          }
          await requestWithConfig("/api/extension/status", {}, config);
          await gmSetValue(CONFIG_KEY, config);
          if (typeof GM_notification === "function") {
            GM_notification("Connected successfully.", "Add to Navidrome");
          }
          close(config);
        } catch (error) {
          status.textContent = error.message || "Could not connect.";
          submitButton.disabled = false;
          submitButton.textContent = "Test and save";
        }
      });
      dialog.showModal();
      tokenInput.focus();
    });
  }

  async function getTrackStates() {
    const states = (await gmGetValue(TRACK_STATES_KEY, {})) || {};
    const cutoff = Date.now() - TERMINAL_STATE_MAX_AGE;
    let changed = false;
    for (const [url, state] of Object.entries(states)) {
      if (
        ["success", "error"].includes(state.status) &&
        Number(state.updatedAt || 0) < cutoff
      ) {
        delete states[url];
        changed = true;
      }
    }
    if (changed) {
      await gmSetValue(TRACK_STATES_KEY, states);
    }
    return states;
  }

  async function saveTrackState(url, state) {
    const states = await getTrackStates();
    const nextState = { ...state, url, updatedAt: Date.now() };
    states[url] = nextState;
    await gmSetValue(TRACK_STATES_KEY, states);
    return nextState;
  }

  function stateFromJob(url, job) {
    return {
      url,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      error: job.error,
    };
  }

  async function addTrack(url) {
    const states = await getTrackStates();
    const existing = states[url];
    if (
      existing &&
      ["queued", "running", "success"].includes(existing.status)
    ) {
      return existing;
    }
    const payload = await requestApi("/api/extension/sync", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    return saveTrackState(url, stateFromJob(url, payload.job));
  }

  async function pollTrack(url, jobId) {
    try {
      const payload = await requestApi(`/api/extension/jobs/${jobId}`);
      return saveTrackState(url, stateFromJob(url, payload.job));
    } catch (error) {
      if (["CONFIG_REQUIRED", "AUTH_FAILED"].includes(error.code)) {
        return saveTrackState(url, {
          jobId,
          status: "error",
          error: error.message,
          message: "Unable to reach Navidrome",
        });
      }
      return null;
    }
  }

  async function addCurrentTrack() {
    if (!currentTrack) return;
    const requestedUrl = currentTrack.url;
    currentState = { status: "starting" };
    renderState();

    try {
      let config = await getConfig();
      if (!config.token) {
        config = await openSettings();
        if (!config) {
          currentState = null;
          renderState();
          return;
        }
      }
      const state = await addTrack(requestedUrl);
      if (currentTrack?.url === requestedUrl) {
        currentState = state;
        renderState();
      }
    } catch (error) {
      if (error.code === "AUTH_FAILED") {
        await gmSetValue(CONFIG_KEY, {
          ...(await getConfig()),
          token: "",
        });
      }
      if (currentTrack?.url === requestedUrl) {
        currentState = { status: "error", error: error.message };
        renderState();
      }
    }
  }

  function managePolling() {
    const shouldPoll =
      currentState?.jobId &&
      ["queued", "running"].includes(currentState.status);
    if (!shouldPoll) {
      clearInterval(pollTimer);
      pollTimer = null;
      return;
    }
    if (pollTimer) return;

    pollTimer = setInterval(async () => {
      const track = currentTrack;
      const state = currentState;
      if (!track || !state?.jobId) return;
      const nextState = await pollTrack(track.url, state.jobId);
      if (currentTrack?.url === track.url && nextState) {
        currentState = nextState;
        renderState();
      }
    }, POLL_INTERVAL_MS);
  }

  async function refreshForLocation() {
    const nextTrack = currentTrackInfo();
    if (
      nextTrack?.url === currentTrack?.url &&
      nextTrack?.provider === currentTrack?.provider
    ) {
      ensureButton();
      return;
    }

    currentTrack = nextTrack;
    currentState = null;
    clearInterval(pollTimer);
    pollTimer = null;
    document.getElementById(BUTTON_CONTAINER_ID)?.remove();
    if (!currentTrack) return;

    ensureButton();
    const states = await getTrackStates();
    currentState = states[currentTrack.url] || null;
    ensureButton();
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      void refreshForLocation();
    });
  }

  function bootstrap() {
    GM_addStyle(STYLES);
    if (window.top === window) {
      GM_registerMenuCommand("Configure Navidrome connection", () => {
        void openSettings();
      });
    }
    if (typeof GM_addValueChangeListener === "function") {
      GM_addValueChangeListener(TRACK_STATES_KEY, (_key, _oldValue, states) => {
        if (currentTrack && states?.[currentTrack.url]) {
          currentState = states[currentTrack.url];
          renderState();
        }
      });
    }

    document.addEventListener("yt-navigate-finish", scheduleRefresh);
    window.addEventListener("popstate", scheduleRefresh);
    if ("onurlchange" in window) {
      window.addEventListener("urlchange", scheduleRefresh);
    }
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    scheduleRefresh();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      STYLES,
      buttonMarkup,
      cleanServerUrl,
      soundcloudTrackUrl,
      stateFromJob,
    };
  }

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof GM_getValue === "function"
  ) {
    bootstrap();
  }
})();
