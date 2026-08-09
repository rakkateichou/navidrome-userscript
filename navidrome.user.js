// ==UserScript==
// @name         Add to Navidrome
// @namespace    https://github.com/rakkateichou/navidrome-userscript
// @version      1.5.0
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
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM_addValueChangeListener
// @grant        GM_getValue
// @grant        GM_info
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
  const BUTTON_TOOLTIP_ID = "navidrome-userscript-add-tooltip";
  const SETTINGS_DIALOG_ID = "navidrome-userscript-settings";
  const SETTINGS_LAUNCHER_ID = "navidrome-userscript-settings-launcher";
  const RUNTIME_MARKER_ID = "navidrome-userscript-runtime";
  const STYLE_ELEMENT_ID = "navidrome-userscript-styles";
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
      flex: 0 0 40px !important;
      height: 40px !important;
      inline-size: 40px !important;
      margin: 0 !important;
      max-inline-size: 40px !important;
      max-width: 40px !important;
      min-inline-size: 40px !important;
      min-width: 40px !important;
      vertical-align: middle;
      width: 40px !important;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="youtube-music"] {
      margin: 0;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="youtube"] {
      align-items: flex-start;
      box-sizing: content-box !important;
      height: 44px !important;
      margin: 0 !important;
      overflow: visible !important;
      padding: 0 0 0 8px !important;
      position: relative !important;
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

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud):not(.navidrome-add-native-soundcloud-player) {
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

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud):not(.navidrome-add-native-soundcloud-player):hover:not(:disabled) {
      background: rgb(127 127 127 / 16%);
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud):not(.navidrome-add-native-soundcloud-player):active:not(:disabled) {
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

    .navidrome-add-button[aria-disabled="true"] {
      cursor: default;
    }

    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud):not(.navidrome-add-native-soundcloud-player)[data-status="success"],
    .navidrome-add-button:not(.navidrome-add-native-youtube):not(.navidrome-add-native-soundcloud):not(.navidrome-add-native-soundcloud-player)[data-status="error"] {
      background: transparent;
      color: inherit;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] .navidrome-add-button {
      align-items: center !important;
      color: inherit !important;
      display: inline-flex !important;
      font-size: 0 !important;
      height: 40px !important;
      justify-content: center !important;
      line-height: 0 !important;
      margin: 0 !important;
      max-height: 40px !important;
      max-width: 40px !important;
      min-height: 40px !important;
      min-width: 40px !important;
      position: relative !important;
      width: 40px !important;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] .navidrome-add-icon {
      display: block !important;
      height: 24px !important;
      max-height: 24px !important;
      max-width: 24px !important;
      min-height: 24px !important;
      min-width: 24px !important;
      width: 24px !important;
    }

    .navidrome-add-tooltip {
      box-sizing: border-box !important;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
      white-space: nowrap;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] {
      overflow: visible !important;
      position: relative !important;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"] .navidrome-add-tooltip {
      background: rgb(28 28 28 / 96%);
      border: 1px solid rgb(255 255 255 / 20%);
      border-radius: 4px;
      bottom: calc(100% + 8px);
      color: #fff;
      font: 500 11px/16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      left: 50%;
      padding: 4px 8px;
      position: absolute !important;
      transform: translateX(-50%);
      transition: opacity 80ms linear;
      z-index: 2147483647;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"]:hover .navidrome-add-tooltip {
      opacity: 1;
      transition-delay: 100ms;
      visibility: visible;
    }

    #${BUTTON_CONTAINER_ID}[data-provider="soundcloud"]:focus-within .navidrome-add-tooltip {
      opacity: 1;
      transition-delay: 0ms;
      visibility: visible;
    }

    #${BUTTON_TOOLTIP_ID}[data-provider="youtube"] {
      background: rgb(97 97 97 / 92%);
      border-radius: 4px;
      color: #fff;
      font: 400 12px/16px Roboto, Arial, sans-serif;
      padding: 8px;
      position: fixed !important;
      transform: translateX(-50%);
      transition: opacity 80ms linear;
      z-index: 2147483647;
    }

    #${BUTTON_TOOLTIP_ID}[data-provider="youtube"][data-visible="true"] {
      opacity: 1;
      visibility: visible;
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
      display: none !important;
    }

    .navidrome-add-settings {
      display: none !important;
    }

    #${BUTTON_CONTAINER_ID}[data-configured="false"] .navidrome-add-note,
    #${BUTTON_CONTAINER_ID}[data-configured="false"] .navidrome-add-plus {
      display: none !important;
    }

    #${BUTTON_CONTAINER_ID}[data-configured="false"] .navidrome-add-settings {
      display: block !important;
    }

    .navidrome-add-button[data-status="success"] .navidrome-add-note,
    .navidrome-add-button[data-status="success"] .navidrome-add-plus {
      display: none !important;
    }

    .navidrome-add-button[data-status="success"] .navidrome-add-check {
      display: block !important;
    }

    .navidrome-add-loading .navidrome-add-icon {
      animation: navidrome-icon-pulse 900ms ease-in-out infinite alternate;
    }

    .navidrome-add-label {
      clip: rect(0 0 0 0) !important;
      clip-path: inset(50%) !important;
      height: 1px !important;
      margin: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
      position: absolute !important;
      white-space: nowrap !important;
      width: 1px !important;
    }

    #${SETTINGS_LAUNCHER_ID} {
      align-items: center;
      appearance: none !important;
      background: #242424;
      border: 1px solid rgb(255 255 255 / 18%);
      border-radius: 999px;
      bottom: max(18px, env(safe-area-inset-bottom));
      box-shadow: 0 5px 18px rgb(0 0 0 / 35%);
      color: #f1f1f1;
      cursor: pointer;
      display: inline-flex;
      font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      gap: 8px;
      height: 40px;
      justify-content: center;
      margin: 0 !important;
      padding: 0 14px !important;
      position: fixed;
      right: max(18px, env(safe-area-inset-right));
      width: auto;
      z-index: 2147483646;
    }

    #${SETTINGS_LAUNCHER_ID}:active {
      background: #333;
    }

    #${SETTINGS_LAUNCHER_ID} svg {
      fill: currentcolor;
      height: 20px;
      width: 20px;
    }

    #${SETTINGS_DIALOG_ID} {
      box-sizing: border-box !important;
      background: #181818;
      border: 1px solid rgb(255 255 255 / 16%);
      border-radius: 16px;
      box-shadow: 0 20px 70px rgb(0 0 0 / 55%);
      color: #f1f1f1;
      color-scheme: dark;
      font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: auto;
      max-width: min(420px, calc(100vw - 32px));
      overflow: hidden;
      padding: 0 !important;
      width: 100%;
      z-index: 2147483647;
    }

    #${SETTINGS_DIALOG_ID}::backdrop {
      background: rgb(0 0 0 / 64%);
      backdrop-filter: blur(5px);
    }

    #${SETTINGS_DIALOG_ID} > form {
      box-sizing: border-box !important;
      display: grid !important;
      gap: 16px !important;
      margin: 0 !important;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 24px !important;
      width: 100% !important;
    }

    #${SETTINGS_DIALOG_ID} h2,
    #${SETTINGS_DIALOG_ID} p {
      margin: 0 !important;
    }

    #${SETTINGS_DIALOG_ID} h2 {
      font-size: 19px;
      line-height: 1.2;
    }

    #${SETTINGS_DIALOG_ID} p {
      color: #aaa;
    }

    #${SETTINGS_DIALOG_ID} label {
      display: grid !important;
      gap: 7px !important;
      margin: 0 !important;
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
      margin: 0 !important;
      padding: 10px 12px !important;
      width: 100%;
    }

    #${SETTINGS_DIALOG_ID} input:focus {
      border-color: #888;
      box-shadow: 0 0 0 3px rgb(255 255 255 / 8%);
    }

    #${SETTINGS_DIALOG_ID} .navidrome-settings-status {
      color: #ff8b8b;
    }

    #${SETTINGS_DIALOG_ID} .navidrome-settings-status:empty {
      display: none;
    }

    #${SETTINGS_DIALOG_ID} .navidrome-settings-actions {
      display: flex !important;
      gap: 10px !important;
      justify-content: flex-end !important;
      margin: 0 !important;
    }

    #${SETTINGS_DIALOG_ID} button {
      appearance: none;
      background: #333;
      border: 0;
      border-radius: 999px;
      color: #fff;
      cursor: pointer;
      font: 600 14px/1 system-ui, sans-serif;
      margin: 0 !important;
      padding: 11px 16px !important;
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
  let hasConfiguredToken = null;

  function modernGmApi() {
    if (typeof GM === "object" && GM) return GM;
    return globalThis.GM || null;
  }

  function modernGmMethod(name) {
    const api = modernGmApi();
    const method = api?.[name];
    return typeof method === "function" ? method.bind(api) : null;
  }

  function legacyGmMethod(name) {
    let lexicalMethod = null;
    switch (name) {
      case "GM_addValueChangeListener":
        lexicalMethod =
          typeof GM_addValueChangeListener === "function"
            ? GM_addValueChangeListener
            : null;
        break;
      case "GM_getValue":
        lexicalMethod = typeof GM_getValue === "function" ? GM_getValue : null;
        break;
      case "GM_notification":
        lexicalMethod =
          typeof GM_notification === "function" ? GM_notification : null;
        break;
      case "GM_registerMenuCommand":
        lexicalMethod =
          typeof GM_registerMenuCommand === "function"
            ? GM_registerMenuCommand
            : null;
        break;
      case "GM_setValue":
        lexicalMethod = typeof GM_setValue === "function" ? GM_setValue : null;
        break;
      case "GM_xmlhttpRequest":
        lexicalMethod =
          typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : null;
        break;
    }
    if (lexicalMethod) return lexicalMethod;
    const method = globalThis[name];
    return typeof method === "function" ? method : null;
  }

  function hasUserscriptStorageApi() {
    return Boolean(modernGmMethod("getValue") || legacyGmMethod("GM_getValue"));
  }

  function userscriptInfo() {
    const api = modernGmApi();
    if (api?.info) return api.info;
    if (typeof GM_info === "object" && GM_info) return GM_info;
    return globalThis.GM_info || null;
  }

  function ensureDocumentStyle(css) {
    let style = document.getElementById(STYLE_ELEMENT_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ELEMENT_ID;
      (document.head || document.documentElement).append(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
    return style;
  }

  function userscriptRequest(details) {
    const modernRequest = modernGmMethod("xmlHttpRequest");
    if (modernRequest) {
      return { kind: "modern", request: modernRequest(details) };
    }
    const legacyRequest = legacyGmMethod("GM_xmlhttpRequest");
    if (legacyRequest) {
      return { kind: "legacy", request: legacyRequest(details) };
    }
    throw new UserscriptError(
      "This userscript manager does not provide cross-origin requests.",
      "UNSUPPORTED_MANAGER",
    );
  }

  function registerSettingsMenu() {
    const register =
      modernGmMethod("registerMenuCommand") ||
      legacyGmMethod("GM_registerMenuCommand");
    if (register) {
      register("Configure Navidrome connection", () => {
        void openSettings();
      });
    }
  }

  function listenForStoredStateChanges(listener) {
    const addListener =
      modernGmMethod("addValueChangeListener") ||
      legacyGmMethod("GM_addValueChangeListener");
    if (addListener) addListener(TRACK_STATES_KEY, listener);
  }

  function notifyConnected() {
    const notify =
      modernGmMethod("notification") || legacyGmMethod("GM_notification");
    if (notify) {
      void Promise.resolve(
        notify("Connected successfully.", "Add to Navidrome"),
      ).catch(() => {});
    }
  }

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
        <path class="navidrome-add-settings" d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65-2-3.46-2.49 1a7.3 7.3 0 0 0-1.69-.98L15 3.25h-4l-.36 2.68c-.61.25-1.17.59-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.08.73 1.69.98l.36 2.68h4l.36-2.68c.61-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"></path>
      </svg>
      <span class="navidrome-add-label">Add to Navidrome</span>
    `;
  }

  function createButtonContent() {
    const namespace = "http://www.w3.org/2000/svg";
    const fragment = document.createDocumentFragment();
    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("navidrome-add-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    const paths = [
      ["navidrome-add-note", "M12 3v11.2a3.7 3.7 0 1 0 2 3.3V8h5V3h-7Z"],
      ["navidrome-add-plus", "M5.5 3v2.5H3v2h2.5V10h2V7.5H10v-2H7.5V3h-2Z"],
      ["navidrome-add-check", "m9.2 19-5.8-5.8 1.8-1.8 4 4 9.6-9.6 1.8 1.8Z"],
      [
        "navidrome-add-settings",
        "M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65-2-3.46-2.49 1a7.3 7.3 0 0 0-1.69-.98L15 3.25h-4l-.36 2.68c-.61.25-1.17.59-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.08.73 1.69.98l.36 2.68h4l.36-2.68c.61-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
      ],
    ];
    for (const [className, pathData] of paths) {
      const path = document.createElementNS(namespace, "path");
      path.classList.add(className);
      path.setAttribute("d", pathData);
      svg.append(path);
    }

    const label = document.createElement("span");
    label.className = "navidrome-add-label";
    label.textContent = "Add to Navidrome";
    fragment.append(svg, label);
    return fragment;
  }

  function createButtonTooltip(provider) {
    const tooltip = document.createElement("span");
    tooltip.id = BUTTON_TOOLTIP_ID;
    tooltip.className = "navidrome-add-tooltip";
    tooltip.dataset.provider = provider;
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = "Add to Navidrome";
    return tooltip;
  }

  function positionYoutubeTooltip(button, tooltip) {
    const rect = button.getBoundingClientRect();
    const halfWidth = tooltip.offsetWidth / 2;
    const center = rect.left + rect.width / 2;
    const left = Math.max(
      halfWidth + 8,
      Math.min(window.innerWidth - halfWidth - 8, center),
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${rect.bottom + 8}px`;
  }

  function attachYoutubeTooltip(button, tooltip) {
    if (button.dataset.navidromeTooltipBound === "true") return;
    button.dataset.navidromeTooltipBound = "true";
    let showTimer = null;

    function hideTooltip() {
      clearTimeout(showTimer);
      showTimer = null;
      tooltip.dataset.visible = "false";
    }

    function showTooltip(delay) {
      clearTimeout(showTimer);
      positionYoutubeTooltip(button, tooltip);
      if (!delay) {
        tooltip.dataset.visible = "true";
        return;
      }
      showTimer = setTimeout(() => {
        if (button.isConnected && tooltip.isConnected) {
          positionYoutubeTooltip(button, tooltip);
          tooltip.dataset.visible = "true";
        }
      }, delay);
    }

    button.addEventListener("mouseenter", () => showTooltip(300));
    button.addEventListener("mouseleave", hideTooltip);
    button.addEventListener("focus", () => showTooltip(0));
    button.addEventListener("blur", hideTooltip);
  }

  function ensureButtonTooltip(container, button, provider) {
    let tooltip = document.getElementById(BUTTON_TOOLTIP_ID);
    if (provider === "soundcloud") {
      if (
        tooltip?.parentElement !== container ||
        tooltip.dataset.provider !== provider
      ) {
        tooltip?.remove();
        tooltip = createButtonTooltip(provider);
        container.append(tooltip);
      }
      return tooltip;
    }
    if (provider === "youtube") {
      if (tooltip?.dataset.provider !== provider) {
        tooltip?.remove();
        tooltip = createButtonTooltip(provider);
        (document.body || document.documentElement).append(tooltip);
      }
      attachYoutubeTooltip(button, tooltip);
      return tooltip;
    }
    tooltip?.remove();
    return null;
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

  function soundcloudTrackReferenceButton() {
    return (
      document.querySelector('button[aria-label="Copy link"]') ||
      document.querySelector('button[aria-label="Share"]')
    );
  }

  function attachButtonInteractions(button) {
    let holdTimer = null;
    let suppressNextClick = false;

    function clearHoldTimer() {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    function openSettingsFromButton() {
      suppressNextClick = true;
      void openSettings()
        .then(refreshSettingsLauncher)
        .catch(reportRuntimeError);
    }

    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      clearHoldTimer();
      holdTimer = setTimeout(openSettingsFromButton, 650);
    });
    button.addEventListener("pointerup", clearHoldTimer);
    button.addEventListener("pointercancel", clearHoldTimer);
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openSettingsFromButton();
      setTimeout(() => {
        suppressNextClick = false;
      }, 900);
    });
    button.addEventListener("click", (event) => {
      if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
        return;
      }
      if (currentState?.status === "success") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      void addCurrentTrack();
    });
  }

  function createNavidromeButton(
    provider,
    youtubeMoreButton,
    soundcloudPlayerReference,
    soundcloudTrackReference,
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
        nativeIcon.replaceChildren(createButtonContent());
      } else {
        button.replaceChildren(createButtonContent());
      }
      button.removeAttribute("aria-expanded");
      button.removeAttribute("aria-haspopup");
      button.removeAttribute("aria-pressed");
    } else if (provider === "soundcloud" && soundcloudTrackReference) {
      button = soundcloudTrackReference.cloneNode(false);
      button.classList.add(
        "navidrome-add-button",
        "navidrome-add-native-soundcloud",
      );
      button.removeAttribute("aria-describedby");
      button.removeAttribute("aria-expanded");
      button.removeAttribute("aria-haspopup");
      button.removeAttribute("aria-pressed");
      button.replaceChildren(createButtonContent());
    } else if (provider === "soundcloud-player" && soundcloudPlayerReference) {
      button = soundcloudPlayerReference.cloneNode(false);
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
      const nativeContent = document.createElement("div");
      nativeContent.append(createButtonContent());
      button.replaceChildren(nativeContent);
    } else {
      button = document.createElement("button");
      button.className = "navidrome-add-button";
      button.append(createButtonContent());
    }
    button.type = "button";
    attachButtonInteractions(button);
    return button;
  }

  function ensureButton() {
    if (!currentTrack) {
      document.getElementById(BUTTON_CONTAINER_ID)?.remove();
      document.getElementById(BUTTON_TOOLTIP_ID)?.remove();
      return;
    }

    const youtubeMoreButton =
      currentTrack.provider === "youtube" ? visibleYoutubeMoreButton() : null;
    const soundcloudPlayerReference =
      currentTrack.provider === "soundcloud-player"
        ? soundcloudPlayerReferenceButton()
        : null;
    const soundcloudTrackReference =
      currentTrack.provider === "soundcloud"
        ? soundcloudTrackReferenceButton()
        : null;
    let container = document.getElementById(BUTTON_CONTAINER_ID);
    const existingButton = container?.querySelector("button");
    const needsYoutubeNative =
      youtubeMoreButton &&
      !existingButton?.classList.contains("navidrome-add-native-youtube");
    const needsSoundcloudNative =
      soundcloudPlayerReference &&
      !existingButton?.classList.contains(
        "navidrome-add-native-soundcloud-player",
      );
    const needsSoundcloudTrackNative =
      soundcloudTrackReference &&
      !existingButton?.classList.contains("navidrome-add-native-soundcloud");
    const hasWrongNativeButton =
      (currentTrack.provider !== "youtube" &&
        existingButton?.classList.contains("navidrome-add-native-youtube")) ||
      (currentTrack.provider !== "soundcloud-player" &&
        existingButton?.classList.contains(
          "navidrome-add-native-soundcloud-player",
        )) ||
      (currentTrack.provider !== "soundcloud" &&
        existingButton?.classList.contains("navidrome-add-native-soundcloud"));
    if (
      container &&
      (needsYoutubeNative ||
        needsSoundcloudNative ||
        needsSoundcloudTrackNative ||
        hasWrongNativeButton)
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
          soundcloudPlayerReference,
          soundcloudTrackReference,
        ),
      );
    }

    container.dataset.provider = currentTrack.provider;
    container.dataset.configured = String(hasConfiguredToken);
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
    ensureButtonTooltip(
      container,
      container.querySelector("button"),
      currentTrack.provider,
    );
    renderState();
    markRuntime("ready");
  }

  function renderState() {
    const button = document.querySelector(`#${BUTTON_CONTAINER_ID} button`);
    if (!button) return;

    const label = button.querySelector(".navidrome-add-label");
    const tooltip = document.getElementById(BUTTON_TOOLTIP_ID);
    const status = currentState?.status || "idle";
    button.dataset.status = status;
    button.classList.toggle(
      "navidrome-add-loading",
      ["starting", "queued", "running"].includes(status),
    );
    button.disabled = ["starting", "queued", "running"].includes(status);
    if (status === "success") {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }
    let text = "Add to Navidrome";
    let title = "";

    if (hasConfiguredToken === false && status === "idle") {
      text = "Configure Navidrome";
    } else if (status === "starting") {
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
    if (tooltip && tooltip.textContent !== text) {
      tooltip.textContent = text;
    }
    if (["soundcloud", "youtube"].includes(currentTrack.provider)) {
      button.removeAttribute("title");
    } else if (button.title !== title) {
      button.title = title;
    }
    const accessibleLabel = status === "error" ? `${text}. ${title}` : text;
    if (button.getAttribute("aria-label") !== accessibleLabel) {
      button.setAttribute("aria-label", accessibleLabel);
    }
    managePolling();
  }

  function createSettingsLauncher() {
    const namespace = "http://www.w3.org/2000/svg";
    const button = document.createElement("button");
    button.id = SETTINGS_LAUNCHER_ID;
    button.type = "button";
    button.title = "Configure Navidrome connection";
    button.setAttribute("aria-label", "Configure Navidrome connection");

    const icon = document.createElementNS(namespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(namespace, "path");
    path.setAttribute(
      "d",
      "M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65-2-3.46-2.49 1a7.3 7.3 0 0 0-1.69-.98L15 3.25h-4l-.36 2.68c-.61.25-1.17.59-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.08.73 1.69.98l.36 2.68h4l.36-2.68c.61-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.11-1.65ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
    );
    icon.append(path);
    const label = document.createElement("span");
    label.textContent = "Set up Navidrome";
    button.append(icon, label);
    button.addEventListener("click", () => {
      void openSettings()
        .then(refreshSettingsLauncher)
        .catch(reportRuntimeError);
    });
    return button;
  }

  async function refreshSettingsLauncher() {
    if (window.top !== window || !document.body) return;
    const config = await getConfig();
    hasConfiguredToken = Boolean(config.token);
    const container = document.getElementById(BUTTON_CONTAINER_ID);
    if (container) {
      container.dataset.configured = String(hasConfiguredToken);
      renderState();
    }
    const existing = document.getElementById(SETTINGS_LAUNCHER_ID);
    if (hasConfiguredToken) {
      existing?.remove();
    } else if (!existing) {
      document.body.append(createSettingsLauncher());
    }
  }

  async function gmGetValue(key, fallback) {
    const getValue =
      modernGmMethod("getValue") || legacyGmMethod("GM_getValue");
    if (!getValue) {
      throw new UserscriptError(
        "This userscript manager does not provide private storage.",
        "UNSUPPORTED_MANAGER",
      );
    }
    return Promise.resolve(getValue(key, fallback));
  }

  async function gmSetValue(key, value) {
    const setValue =
      modernGmMethod("setValue") || legacyGmMethod("GM_setValue");
    if (!setValue) {
      throw new UserscriptError(
        "This userscript manager does not provide private storage.",
        "UNSUPPORTED_MANAGER",
      );
    }
    return Promise.resolve(setValue(key, value));
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
      try {
        const started = userscriptRequest({
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
        if (started.kind === "modern" && started.request?.catch) {
          started.request.catch(() => {});
        }
      } catch (error) {
        reject(error);
      }
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

  function showSettingsDialog(dialog) {
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  async function openSettings() {
    const existing = document.getElementById(SETTINGS_DIALOG_ID);
    if (existing) {
      showSettingsDialog(existing);
      return null;
    }

    const current = await getConfig();
    const dialog = document.createElement("dialog");
    dialog.id = SETTINGS_DIALOG_ID;
    const form = document.createElement("form");
    form.method = "dialog";

    const heading = document.createElement("h2");
    heading.textContent = "Connect to Navidrome";
    const description = document.createElement("p");
    description.textContent =
      "The access token stays in your userscript manager's private storage. Saving it will not add the current track.";

    const serverInput = document.createElement("input");
    serverInput.name = "serverUrl";
    serverInput.type = "url";
    serverInput.autocomplete = "url";
    serverInput.required = true;
    const serverLabel = document.createElement("label");
    serverLabel.append(document.createTextNode("Server URL"), serverInput);

    const tokenInput = document.createElement("input");
    tokenInput.name = "token";
    tokenInput.type = "password";
    tokenInput.autocomplete = "off";
    tokenInput.minLength = 32;
    tokenInput.required = true;
    const tokenLabel = document.createElement("label");
    tokenLabel.append(document.createTextNode("Access token"), tokenInput);

    const status = document.createElement("div");
    status.className = "navidrome-settings-status";
    status.setAttribute("role", "status");
    const actions = document.createElement("div");
    actions.className = "navidrome-settings-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.value = "cancel";
    cancelButton.textContent = "Cancel";
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Test and save";
    actions.append(cancelButton, submitButton);
    form.append(heading, description, serverLabel, tokenLabel, status, actions);
    dialog.append(form);
    document.body.append(dialog);

    serverInput.value = current.serverUrl;
    tokenInput.value = current.token;

    return new Promise((resolve) => {
      function close(result) {
        if (typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
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
          notifyConnected();
          await refreshSettingsLauncher();
          close(config);
        } catch (error) {
          status.textContent = error.message || "Could not connect.";
          submitButton.disabled = false;
          submitButton.textContent = "Test and save";
        }
      });
      showSettingsDialog(dialog);
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

    try {
      const config = await getConfig();
      if (!config.token) {
        await openSettings();
        currentState = null;
        renderState();
        return;
      }
      currentState = { status: "starting" };
      renderState();
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
        await refreshSettingsLauncher();
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
    document.getElementById(BUTTON_TOOLTIP_ID)?.remove();
    if (!currentTrack) {
      markRuntime("idle");
      return;
    }

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
      void refreshForLocation().catch(reportRuntimeError);
    });
  }

  function markRuntime(phase, error) {
    let marker = document.getElementById(RUNTIME_MARKER_ID);
    if (!marker) {
      marker = document.createElement("meta");
      marker.id = RUNTIME_MARKER_ID;
      marker.setAttribute("name", "navidrome-userscript");
      (document.head || document.documentElement).append(marker);
    }
    marker.setAttribute(
      "content",
      userscriptInfo()?.script?.version || "unknown",
    );
    marker.dataset.phase = phase;
    if (error) {
      marker.dataset.error = error.message || String(error);
    } else {
      delete marker.dataset.error;
    }
  }

  function reportRuntimeError(error) {
    markRuntime("error", error);
    console.error("Add to Navidrome userscript failed:", error);
  }

  function bootstrap() {
    markRuntime("booting");
    ensureDocumentStyle(STYLES);
    if (window.top === window) {
      registerSettingsMenu();
      void refreshSettingsLauncher().catch(reportRuntimeError);
    }
    listenForStoredStateChanges((_key, _oldValue, states) => {
      if (currentTrack && states?.[currentTrack.url]) {
        currentState = states[currentTrack.url];
        renderState();
      }
    });

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
    markRuntime("observing");
    scheduleRefresh();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      STYLES,
      buttonMarkup,
      cleanServerUrl,
      ensureDocumentStyle,
      hasUserscriptStorageApi,
      soundcloudTrackUrl,
      stateFromJob,
    };
  }

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    hasUserscriptStorageApi()
  ) {
    try {
      bootstrap();
    } catch (error) {
      reportRuntimeError(error);
    }
  }
})();
