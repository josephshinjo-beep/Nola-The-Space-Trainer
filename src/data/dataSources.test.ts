import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATA_SOURCES, numberRows, readableName } from './dataSources';

describe('the Data sources page', () => {
  it('lists every number in the sol engine, labelled real or game value', () => {
    const rows = numberRows();
    expect(rows.length).toBeGreaterThan(60);
    expect(rows.filter((row) => row.real).map((row) => row.path)).toEqual(
      expect.arrayContaining(['crew.oxygenPerPersonPerSol', 'radiation.surfaceDosePerSol', 'radiation.careerLimit', 'time.solLengthSeconds']),
    );
    expect(rows.find((row) => row.path === 'storm.everySols')?.real).toBe(false);
    // Real ones are listed first.
    const firstGame = rows.findIndex((row) => !row.real);
    expect(rows.slice(firstGame).every((row) => !row.real)).toBe(true);
  });

  it('names every NASA API the server code actually calls', () => {
    let checked = 0;
    const endpoints = DATA_SOURCES.flatMap((source) => source.endpoints).join(' ');
    for (const file of ['api/space-events.ts', 'api/space-weather.ts', 'api/astronaut-science.ts']) {
      const code = readFileSync(file, 'utf8');
      // The URL constants the code fetches from (not links in comments).
      for (const host of [...code.matchAll(/=\s*'(https:\/\/[a-z.]+\.nasa\.gov\/[A-Za-z/-]+)'/g)].map((m) => m[1]!)) {
        expect(endpoints, `${file}: ${host}`).toContain(host);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it('points to files that exist', () => {
    for (const source of DATA_SOURCES) for (const file of source.files) expect(() => readFileSync(file.replace(/\/$/, '/README.md'))).not.toThrow();
  });

  it('turns config paths into readable names', () => {
    expect(readableName('crew.oxygenPerPersonPerSol')).toBe('Crew: oxygen per person per sol');
  });
});
