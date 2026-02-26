import type {StartupVersionStatus} from '@/model/secret-variables.ts';
import {fetch as tauriFetch} from '@tauri-apps/plugin-http';

export interface DesktopVersionGateResponse {
	status: StartupVersionStatus;
	isBlocking: boolean;
	isPatch: boolean;
	message: string | null;
	currentVersion: string;
	latestVersion: string | null;
}

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
}

const getInvalidFormatError = (input: string) => `Ugyldig versjonsformat: ${input}`;

export function parseVersion(input: string): ParsedVersion {
	const trimmed = input.trim().replace(/^[vV]/, '');
	const parts = trimmed.split('.');

	if (parts.length !== 3) {
		throw new Error(getInvalidFormatError(input));
	}
	if (parts[2].includes('-') || parts[2].includes('+')) {
		throw new Error(`${getInvalidFormatError(input)}. Appended informasjon støttes ikke.`);
	}
	if (parts.some((part) => !/^\d+$/.test(part))) {
		throw new Error(getInvalidFormatError(input));
	}

	return {
		major: Number(parts[0]),
		minor: Number(parts[1]),
		patch: Number(parts[2]),
	};
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	return a.patch - b.patch;
}

export function evaluateDesktopVersionGate(
	currentVersion: string,
	latestVersion: string,
): DesktopVersionGateResponse {
	const currentVersionText = `v${currentVersion}`;
	let current: ParsedVersion;
	let latest: ParsedVersion;

	try {
		current = parseVersion(currentVersion);
	} catch (error) {
		throw new Error(`${(error as Error).message} (nåværende versjon: ${currentVersionText})`);
	}

	try {
		latest = parseVersion(latestVersion);
	} catch (error) {
		throw new Error(
			`${(error as Error).message} (nåværende versjon: ${currentVersionText}, mottatt siste versjon: ${latestVersion})`,
		);
	}

	if (compareVersions(current, latest) >= 0) {
		return {
			status: 'UP_TO_DATE',
			isBlocking: false,
			isPatch: false,
			message: null,
			currentVersion: currentVersionText,
			latestVersion,
		};
	}

	if (current.major !== latest.major) {
		return {
			status: 'MAJOR_BLOCKING',
			isBlocking: true,
			isPatch: false,
			message: `Ny hovedversjon er tilgjengelig (${latestVersion}). Nåværende versjon: ${currentVersionText}. Oppdater appen før du kan TRØKKE.`,
			currentVersion: currentVersionText,
			latestVersion,
		};
	}

	if (current.minor !== latest.minor) {
		return {
			status: 'MINOR_BLOCKING',
			isBlocking: true,
			isPatch: false,
			message: `Ny delversjon er tilgjengelig (${latestVersion}). Nåværende versjon: ${currentVersionText}. Oppdater appen før du kan TRØKKE.`,
			currentVersion: currentVersionText,
			latestVersion,
		};
	}

	return {
		status: 'PATCH_AVAILABLE',
		isBlocking: false,
		isPatch: true,
		message: `Ny patch-versjon er tilgjengelig (${latestVersion}). Du kan fortsette, men det anbefales å oppdatere.`,
		currentVersion: currentVersionText,
		latestVersion,
	};
}

export async function fetchLatestDesktopVersion(
	desktopVersionBaseUri: string,
): Promise<string> {
	const desktopVersionUri = `${desktopVersionBaseUri.trim().replace(/\/+$/, '')}/Tr%C3%B8kk`;

    const raw = await tauriFetch(desktopVersionUri).then((res) => {
		if (!res.ok) {
			throw new Error(`Failed to fetch desktop version. HTTP status: ${res.status}`);
		}
		return res.text();
	});

    const normalized = raw.trim().replace(/^"|"$/g, '').trim();
	if (!normalized) {
		throw new Error('Versjonssvar var tomt.');
	}

	return normalized;
}
