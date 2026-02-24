import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	compareVersions,
	evaluateDesktopVersionGate,
	fetchLatestDesktopVersion,
	parseVersion,
} from '../src/lib/version-gate';

describe('version-gate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('parses supported version formats', () => {
		expect(parseVersion('1.2.3')).toEqual({major: 1, minor: 2, patch: 3});
		expect(parseVersion('v1.2.3')).toEqual({major: 1, minor: 2, patch: 3});
		expect(parseVersion(' V1.2.3 ')).toEqual({major: 1, minor: 2, patch: 3});
	});

	it('rejects unsupported version formats', () => {
		for (const version of ['1.2', '1.2.3.4', '1.2.x', '1.2.3-beta', '1.2.3+build', '']) {
			expect(() => parseVersion(version)).toThrow();
		}
	});

	it('compares versions in semver order', () => {
		expect(compareVersions(parseVersion('1.2.3'), parseVersion('1.2.3'))).toBe(0);
		expect(compareVersions(parseVersion('1.2.4'), parseVersion('1.2.3'))).toBeGreaterThan(0);
		expect(compareVersions(parseVersion('1.3.0'), parseVersion('1.9.9'))).toBeLessThan(0);
		expect(compareVersions(parseVersion('2.0.0'), parseVersion('1.99.99'))).toBeGreaterThan(0);
		expect(compareVersions(parseVersion('1.2.2'), parseVersion('1.2.3'))).toBeLessThan(0);
	});

	it('evaluates major/minor/patch/up-to-date statuses', () => {
		expect(evaluateDesktopVersionGate('1.2.3', '1.2.3').status).toBe('UP_TO_DATE');
		expect(evaluateDesktopVersionGate('1.2.3', '1.2.4').status).toBe('PATCH_AVAILABLE');
		expect(evaluateDesktopVersionGate('1.2.3', '1.3.0').status).toBe('MINOR_BLOCKING');
		expect(evaluateDesktopVersionGate('1.2.3', '2.0.0').status).toBe('MAJOR_BLOCKING');
	});

	it('includes versions in blocking messages', () => {
		const res = evaluateDesktopVersionGate('1.2.3', '1.3.0');
		expect(res.message).toContain('1.3.0');
		expect(res.message).toContain('v1.2.3');
	});

	it('fetches and normalizes latest desktop version', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '"1.2.3"',
		} as Response);

		const latest = await fetchLatestDesktopVersion('https://example.com/version/');
		expect(latest).toBe('1.2.3');
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/version/Tr%C3%B8kk', {
			method: 'GET',
			signal: expect.any(AbortSignal),
		});
		fetchMock.mockRestore();
	});

	it('throws when latest desktop version response is empty', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '   ',
		} as Response);

		await expect(fetchLatestDesktopVersion('https://example.com/version')).rejects.toThrow('Versjonssvar var tomt.');
		fetchMock.mockRestore();
	});

	it('times out when latest desktop version never responds', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

		const pending = fetchLatestDesktopVersion('https://example.com/version', 10);
		const assertion = expect(pending).rejects.toThrow('Versjonssjekk timet ut');
		await vi.advanceTimersByTimeAsync(20);
		await assertion;
		fetchMock.mockRestore();
		vi.useRealTimers();
	});
});
