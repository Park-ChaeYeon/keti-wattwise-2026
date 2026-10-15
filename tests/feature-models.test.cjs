const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function loadTypeScript(path) {
  const source = fs.readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(path);
  loaded._compile(compiled, path.replace(/\.ts$/, '.cjs'));
  return loaded.exports;
}

const households = loadTypeScript('src/features/households/model.ts');
const analytics = loadTypeScript('src/features/analytics/benchmark.ts');

test('household calculator reacts to occupancy and observed appliance changes', () => {
  const settings = structuredClone(households.INITIAL_SETTINGS);
  const normal = households.calculateHouseholdUsage(settings, 2, 'normal', 'normal');
  const home = households.calculateHouseholdUsage(settings, 2, 'home', 'normal');
  assert.ok(home.monthly > normal.monthly);
  settings.aircon.todayHours = 20;
  const unusual = households.calculateHouseholdUsage(settings, 2, 'normal', 'normal');
  assert.ok(unusual.unusual.some((item) => item.id === 'aircon'));
  assert.ok(unusual.score > 0);
});

test('benchmark analysis respects selected day range and produces chart contracts', () => {
  const house = { id: 'house_1', values: Array.from({ length: 31 * 24 }, (_, index) => index % 24) };
  const result = analytics.buildBenchmarkAnalysis(house, 3, 5);
  assert.equal(result.start, 3);
  assert.equal(result.end, 5);
  assert.equal(result.values.length, 72);
  assert.equal(result.hourly.length, 24);
  assert.equal(result.weekday.length, 7);
  assert.equal(result.daily.length, 3);
  assert.equal(result.heat.length, 7);
});

test('benchmark analysis normalizes reversed and out-of-range dates', () => {
  const house = { id: 'house_1', values: Array(31 * 24).fill(1) };
  const result = analytics.buildBenchmarkAnalysis(house, 40, -2);
  assert.equal(result.start, 1);
  assert.equal(result.end, 31);
  assert.equal(result.values.length, 31 * 24);
});
