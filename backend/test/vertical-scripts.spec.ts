import { runVerticalScript, availableVerticalScripts } from '../scripts/verticals';

describe('vertical scripts registry', () => {
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

  afterEach(() => {
    infoSpy.mockClear();
  });

  afterAll(() => {
    infoSpy.mockRestore();
  });

  it('returns known script names', () => {
    const scripts = availableVerticalScripts();
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts).toContain('create_retail_catalogs');
  });

  it('runs noop handler for known script', async () => {
    await runVerticalScript('create_retail_catalogs', { organizationId: 77 });
    expect(infoSpy).toHaveBeenCalledWith(
      '[vertical-script] create_retail_catalogs ejecutado para organizacion 77',
    );
  });
});
