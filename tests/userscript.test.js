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
  soundcloudTrackUrl,
  stateFromJob,
} = require(scriptPath);

test("userscript metadata supports all three sites and automatic updates", () => {
  assert.match(source, /@version\s+1\.2\.0/);
  assert.match(source, /@match\s+https:\/\/www\.youtube\.com\/\*/);
  assert.match(source, /@match\s+https:\/\/music\.youtube\.com\/\*/);
  assert.match(source, /@match\s+https:\/\/soundcloud\.com\/\*/);
  assert.match(source, /@grant\s+GM_xmlhttpRequest/);
  assert.match(source, /@sandbox\s+DOM/);
  assert.match(source, /@inject-into\s+content/);
  assert.match(
    source,
    /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/rakkateichou\/navidrome-userscript\/master\/navidrome\.user\.js/,
  );
  assert.doesNotMatch(source, /__UPDATE_URL__/);
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
  assert.match(markup, /navidrome-add-label/);
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

test("userscript no longer depends on Chrome extension messaging", () => {
  assert.doesNotMatch(source, /chrome\.runtime/);
  assert.doesNotMatch(source, /chrome\.storage/);
  assert.match(source, /GM_addValueChangeListener/);
});

test("public source never contains a Navidrome access token", () => {
  assert.doesNotMatch(source, /Bearer\s+[A-Za-z0-9_-]{32,}/);
  assert.match(source, /authorization: `Bearer \$\{config\.token\}`/);
  assert.match(source, /GM_setValue\(key, value\)/);
});
