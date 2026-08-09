const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const scriptPath = path.join(__dirname, "..", "navidrome.user.js");
const source = fs.readFileSync(scriptPath, "utf8");
const {
  STYLES,
  buttonMarkup,
  cleanServerUrl,
  ensureDocumentStyle,
  hasUserscriptStorageApi,
  soundcloudTrackUrl,
  stateFromJob,
} = require(scriptPath);

test("userscript metadata supports all three sites and automatic updates", () => {
  assert.match(source, /@version\s+1\.4\.10/);
  assert.match(source, /@match\s+https:\/\/www\.youtube\.com\/\*/);
  assert.match(source, /@match\s+https:\/\/music\.youtube\.com\/\*/);
  assert.match(source, /@match\s+https:\/\/soundcloud\.com\/\*/);
  assert.match(source, /@grant\s+GM\.getValue/);
  assert.match(source, /@grant\s+GM\.setValue/);
  assert.match(source, /@grant\s+GM\.xmlHttpRequest/);
  assert.match(source, /@grant\s+GM_xmlhttpRequest/);
  assert.match(source, /@sandbox\s+DOM/);
  assert.match(source, /@inject-into\s+content/);
  assert.match(
    source,
    /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/rakkateichou\/navidrome-userscript\/master\/navidrome\.user\.js/,
  );
  assert.doesNotMatch(source, /__UPDATE_URL__/);
});

test("supports both modern Safari and legacy userscript storage APIs", () => {
  const savedModernApi = globalThis.GM;
  const savedLegacyGetValue = globalThis.GM_getValue;
  try {
    delete globalThis.GM_getValue;
    globalThis.GM = { getValue() {} };
    assert.equal(hasUserscriptStorageApi(), true);

    delete globalThis.GM;
    globalThis.GM_getValue = () => {};
    assert.equal(hasUserscriptStorageApi(), true);

    delete globalThis.GM_getValue;
    assert.equal(hasUserscriptStorageApi(), false);
  } finally {
    if (savedModernApi === undefined) delete globalThis.GM;
    else globalThis.GM = savedModernApi;
    if (savedLegacyGetValue === undefined) delete globalThis.GM_getValue;
    else globalThis.GM_getValue = savedLegacyGetValue;
  }
});

test("injects one identified stylesheet into the current document", () => {
  const savedDocument = globalThis.document;
  const elements = new Map();
  const head = {
    append(element) {
      elements.set(element.id, element);
    },
  };
  try {
    globalThis.document = {
      head,
      documentElement: head,
      getElementById(id) {
        return elements.get(id) || null;
      },
      createElement(tagName) {
        return { id: "", tagName: tagName.toUpperCase(), textContent: "" };
      },
    };

    const first = ensureDocumentStyle("first stylesheet");
    const second = ensureDocumentStyle("updated stylesheet");

    assert.equal(first, second);
    assert.equal(first.id, "navidrome-userscript-styles");
    assert.equal(first.textContent, "updated stylesheet");
    assert.equal(elements.size, 1);
  } finally {
    if (savedDocument === undefined) delete globalThis.document;
    else globalThis.document = savedDocument;
  }
  assert.doesNotMatch(source, /GM\.addStyle|GM_addStyle/);
});

test("detects the lexical GM object used by Userscripts Safari", () => {
  const injectedModule = { exports: {} };
  const injectLikeUserscriptsSafari = Function(
    "{GM,GM_info}",
    "module",
    source,
  );
  injectLikeUserscriptsSafari(
    {
      GM: { getValue() {} },
      GM_info: { scriptHandler: "Userscripts" },
    },
    injectedModule,
  );
  assert.equal(injectedModule.exports.hasUserscriptStorageApi(), true);
});

test("SoundCloud track URLs normalize the modern iframe route", () => {
  assert.equal(
    soundcloudTrackUrl(
      "https://soundcloud.com/n/gonefluddmus/kubik-lyda",
      "https://soundcloud.com",
    ),
    "https://soundcloud.com/gonefluddmus/kubik-lyda",
  );
  assert.equal(
    soundcloudTrackUrl("/artist/track", "https://soundcloud.com"),
    "https://soundcloud.com/artist/track",
  );
  assert.equal(soundcloudTrackUrl("/discover", "https://soundcloud.com"), null);
  assert.equal(
    soundcloudTrackUrl("/artist/sets/album", "https://soundcloud.com"),
    null,
  );
});

test("server URL validation only permits HTTPS or local HTTP", () => {
  assert.equal(
    cleanServerUrl("https://music.example.test/path"),
    "https://music.example.test",
  );
  assert.equal(
    cleanServerUrl("http://localhost:8000/path"),
    "http://localhost:8000",
  );
  assert.throws(() => cleanServerUrl("http://music.example.test"), /HTTPS/);
});

test("job state retains the fields used by the inline status UI", () => {
  assert.deepEqual(
    stateFromJob("https://www.youtube.com/watch?v=test", {
      id: "job-1",
      status: "running",
      progress: 42,
      message: "Downloading audio",
      error: null,
    }),
    {
      url: "https://www.youtube.com/watch?v=test",
      jobId: "job-1",
      status: "running",
      progress: 42,
      message: "Downloading audio",
      error: null,
    },
  );
});

test("button markup provides idle and success icons", () => {
  const markup = buttonMarkup();
  assert.match(markup, /navidrome-add-note/);
  assert.match(markup, /navidrome-add-plus/);
  assert.match(markup, /navidrome-add-check/);
  assert.match(markup, /navidrome-add-settings/);
  assert.match(markup, /navidrome-add-label/);
});

test("DOM construction does not depend on innerHTML or TrustedHTML", () => {
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /createElementNS/);
  assert.match(source, /replaceChildren\(createButtonContent\(\)\)/);
});

test("SoundCloud player delegates its surface and hover behavior to native classes", () => {
  assert.match(source, /soundcloudPlayerReferenceButton/);
  assert.match(source, /cloneNode\(false\)/);
  assert.match(source, /navidrome-add-native-soundcloud-player/);
  assert.doesNotMatch(
    STYLES,
    /soundcloud-player[^}]*\.navidrome-add-button:hover[^}]*background/s,
  );
});

test("SoundCloud track control inherits the native button hover surface", () => {
  assert.match(source, /function soundcloudTrackReferenceButton\(\)/);
  assert.match(
    source,
    /provider === "soundcloud" && soundcloudTrackReference[\s\S]*?soundcloudTrackReference\.cloneNode\(false\)/,
  );
  assert.match(source, /navidrome-add-native-soundcloud/);
  const soundcloudButtonRule = STYLES.match(
    /data-provider="soundcloud"\] \.navidrome-add-button \{([^}]*)\}/,
  );
  assert.ok(soundcloudButtonRule);
  assert.doesNotMatch(soundcloudButtonRule[1], /background|border|box-shadow/);
  assert.match(
    STYLES,
    /data-provider="soundcloud"[^}]*flex: 0 0 40px !important[^}]*margin: 0 !important[^}]*width: 40px !important/s,
  );
  assert.match(
    STYLES,
    /data-provider="soundcloud"[^}]*navidrome-add-button[^}]*height: 40px !important[^}]*width: 40px !important/s,
  );
  assert.match(
    STYLES,
    /data-provider="soundcloud"[^}]*navidrome-add-icon[^}]*height: 24px !important[^}]*width: 24px !important/s,
  );
  assert.match(
    STYLES,
    /navidrome-add-label[^}]*position: absolute !important/s,
  );
  assert.match(STYLES, /navidrome-add-settings[^}]*display: none !important/s);
});

test("YouTube control reserves its own left gutter", () => {
  assert.match(
    STYLES,
    /data-provider="youtube"[^}]*box-sizing: content-box !important[^}]*padding: 0 0 0 8px !important/s,
  );
});

test("SoundCloud uses its native tooltip dimensions and delay", () => {
  assert.match(source, /function createButtonTooltip\(provider\)/);
  assert.match(source, /tooltip\.textContent = text/);
  assert.match(
    STYLES,
    /data-provider="soundcloud"[^}]*navidrome-add-tooltip[^}]*font: 500 11px\/16px[^}]*padding: 4px 8px/s,
  );
  assert.match(
    STYLES,
    /data-provider="soundcloud"[^}]*:hover \.navidrome-add-tooltip[^}]*transition-delay: 100ms/s,
  );
});

test("YouTube renders its state label in an unclipped native-style portal", () => {
  const youtubeTooltipRule = STYLES.match(
    /#navidrome-userscript-add-tooltip\[data-provider="youtube"\] \{([^}]*)\}/,
  );
  assert.ok(youtubeTooltipRule);
  assert.match(youtubeTooltipRule[1], /font: 400 12px\/16px Roboto/);
  assert.match(youtubeTooltipRule[1], /position: fixed/);
  assert.match(source, /function positionYoutubeTooltip\(button, tooltip\)/);
  assert.match(
    source,
    /button\.addEventListener\("mouseenter", \(\) => showTooltip\(300\)\)/,
  );
  assert.match(source, /document\.body \|\| document\.documentElement/);
  assert.match(source, /button\.removeAttribute\("title"\)/);
});

test("a completed track remains hoverable without being added twice", () => {
  assert.match(
    source,
    /button\.disabled = \["starting", "queued", "running"\]\.includes\(status\)/,
  );
  assert.match(source, /button\.setAttribute\("aria-disabled", "true"\)/);
  assert.match(source, /if \(currentState\?\.status === "success"\)/);
});

test("userscript no longer depends on Chrome extension messaging", () => {
  assert.doesNotMatch(source, /chrome\.runtime/);
  assert.doesNotMatch(source, /chrome\.storage/);
  assert.match(source, /GM_addValueChangeListener/);
});

test("configuration remains accessible without a userscript menu", () => {
  assert.match(source, /navidrome-userscript-settings-launcher/);
  assert.match(source, /Set up Navidrome/);
  assert.match(source, /Saving it will not add the current track/);
  assert.match(source, /attachButtonInteractions/);
  assert.match(source, /pointerdown/);
  assert.match(source, /contextmenu/);
});

test("first-run setup does not immediately add the open track", () => {
  assert.match(
    source,
    /if \(!config\.token\) \{\s*await openSettings\(\);\s*currentState = null;\s*renderState\(\);\s*return;/,
  );
});

test("settings dialog spacing wins over host-page form resets", () => {
  assert.match(STYLES, /> form \{/);
  assert.match(STYLES, /padding: 24px !important/);
  assert.match(STYLES, /navidrome-settings-status:empty/);
});

test("runtime health is exposed without leaking configuration", () => {
  assert.match(source, /navidrome-userscript-runtime/);
  assert.match(source, /markRuntime\("ready"\)/);
  assert.doesNotMatch(source, /marker\.dataset\.token/);
});

test("public source never contains a Navidrome access token", () => {
  assert.doesNotMatch(source, /Bearer\s+[A-Za-z0-9_-]{32,}/);
  assert.match(source, /authorization: `Bearer \$\{config\.token\}`/);
  assert.match(source, /gmSetValue\(CONFIG_KEY, config\)/);
});
