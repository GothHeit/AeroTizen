const assert = require("node:assert/strict");
const { test } = require("node:test");

const { loadTypeScript } = require("./helpers/load_typescript.cjs");
const { catalogues, resolveLanguage } = loadTypeScript("launcher/src/shared/i18n/catalogues.ts");
const { createTranslations } = loadTypeScript("launcher/src/shared/i18n/createTranslations.ts");
const english = require("../launcher/src/shared/i18n/en.json");
const portuguese = require("../launcher/src/shared/i18n/pt.json");

const placeholders = (text) => (text.match(/\{\{\w+\}\}/g) || []).sort();

test("Portuguese covers every message and keeps each placeholder", () => {
  assert.deepEqual(Object.keys(portuguese).sort(), Object.keys(english).sort());
  for (const [key, text] of Object.entries(english)) {
    assert.deepEqual(placeholders(portuguese[key]), placeholders(text), key);
  }
});

test("Brazilian and European Portuguese TVs both resolve to Portuguese", () => {
  assert.equal(catalogues.pt.name, "Português");
  assert.equal(resolveLanguage("auto", ["pt-BR"]), "pt");
  assert.equal(resolveLanguage("auto", ["pt_PT"]), "pt");
  assert.equal(resolveLanguage("pt", ["en-US"]), "pt");
  const translations = createTranslations("pt");
  assert.equal(translations.getSnapshot().t("continue.episode", { season: 1, episode: 6 }), "T1 E6");
  assert.equal(
    translations.getSnapshot().t("apps.openFailed", { name: "Globoplay" }),
    "Não foi possível abrir Globoplay",
  );
});
