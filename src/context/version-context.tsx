import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import * as Sentry from '@sentry/react';
import {StartupVersionStatus} from '@/model/secret-variables.ts';
import {
	DesktopVersionGateResponse,
	evaluateDesktopVersionGate,
	fetchLatestDesktopVersion,
} from '@/lib/version-gate.ts';

interface VersionContextType {
	startupVersionStatus: StartupVersionStatus | null;
	startupVersionMessage: string | null;
	startupVersionError: string | null;
	isCheckingStartupVersion: boolean;
	hasCheckedStartupVersion: boolean;
	isStartupBlocking: boolean;
	requiresManualLogin: boolean;
	uploadVersionBlocking: boolean;
	uploadVersionMessage: string | null;
	retryStartupVersionCheck: () => Promise<void>;
	checkUploadVersionGate: () => Promise<boolean>;
	canFetchStartupSecrets: boolean;
}

const VersionContext = createContext<VersionContextType | null>(null);

const getDesktopVersionUri = () => {
	const value = import.meta.env.VITE_PAPI_API_DESKTOP_VERSION_URI as string | undefined;
	return value?.trim() || null;
};

const getCurrentAppVersion = () => {
	const value = import.meta.env.VITE_APP_VERSION as string | undefined;
	return value?.trim() || '0.0.0';
};

const getErrorMessage = (error: unknown): string => {
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object') {
		const knownError = error as { message?: string; error?: string };
		if (knownError.message) return knownError.message;
		if (knownError.error) return knownError.error;
	}
	return String(error);
};

const VERSION_GATE_COMMAND = 'frontend_desktop_version_gate';

export const VersionProvider: React.FC<{ children: ReactNode }> = ({children}) => {
	const [startupVersionStatus, setStartupVersionStatus] = useState<StartupVersionStatus | null>(null);
	const [startupVersionMessage, setStartupVersionMessage] = useState<string | null>(null);
	const [startupVersionError, setStartupVersionError] = useState<string | null>(null);
	const [isCheckingStartupVersion, setIsCheckingStartupVersion] = useState<boolean>(true);
	const [hasCheckedStartupVersion, setHasCheckedStartupVersion] = useState<boolean>(false);
	const [uploadVersionBlocking, setUploadVersionBlocking] = useState<boolean>(false);
	const [uploadVersionMessage, setUploadVersionMessage] = useState<string | null>(null);

	const isStartupBlocking =
		startupVersionStatus === 'MAJOR_BLOCKING' || startupVersionStatus === 'MINOR_BLOCKING';
	const requiresManualLogin = startupVersionStatus === 'PATCH_AVAILABLE';
	const canFetchStartupSecrets =
		hasCheckedStartupVersion && !isCheckingStartupVersion && !startupVersionError && !isStartupBlocking;

	const runVersionGateCheck = useCallback(async (desktopVersionUri: string): Promise<DesktopVersionGateResponse> => {
		const currentVersion = getCurrentAppVersion();
		const latestVersion = await fetchLatestDesktopVersion(desktopVersionUri);
		return evaluateDesktopVersionGate(currentVersion, latestVersion);
	}, []);

	const applyVersionResponse = useCallback((response: DesktopVersionGateResponse) => {
		setStartupVersionStatus(response.status);
		setStartupVersionMessage(response.message ?? null);
		setStartupVersionError(null);
		setHasCheckedStartupVersion(true);
	}, []);

	const runStartupVersionCheck = useCallback(async () => {
		const desktopVersionUri = getDesktopVersionUri();
		if (!desktopVersionUri) {
			setStartupVersionStatus(null);
			setStartupVersionMessage(null);
			setStartupVersionError(
				'Mangler konfigurasjon for versjonssjekk (VITE_PAPI_API_DESKTOP_VERSION_URI).'
			);
			setHasCheckedStartupVersion(true);
			return;
		}

		Sentry.addBreadcrumb({
			category: 'external.version',
			message: 'Startup version check started',
			level: 'info',
			data: {
				command: VERSION_GATE_COMMAND,
			},
		});
		Sentry.captureMessage('Startup version check started', 'info');

		return runVersionGateCheck(desktopVersionUri)
			.then((response) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Startup version check completed',
					level: 'info',
					data: {
						command: VERSION_GATE_COMMAND,
						status: response.status,
					},
				});
				Sentry.captureMessage('Startup version check completed', 'info');
				return response;
			})
			.then(applyVersionResponse)
			.catch((error) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Startup version check failed',
					level: 'error',
					data: {
						command: VERSION_GATE_COMMAND,
						error: getErrorMessage(error),
					},
				});
				Sentry.captureMessage('Startup version check failed', 'error');
				setStartupVersionStatus(null);
				setStartupVersionMessage(null);
				setStartupVersionError(`Kunne ikke sjekke versjon ved oppstart. ${getErrorMessage(error)}`);
				setHasCheckedStartupVersion(true);
				throw error;
			});
	}, [applyVersionResponse, runVersionGateCheck]);

	const retryStartupVersionCheck = useCallback(async () => {
		setIsCheckingStartupVersion(true);
		await runStartupVersionCheck()
			.catch(() => undefined)
			.finally(() => setIsCheckingStartupVersion(false));
	}, [runStartupVersionCheck]);

	const checkUploadVersionGate = useCallback(async (): Promise<boolean> => {
		const desktopVersionUri = getDesktopVersionUri();
		if (!desktopVersionUri) {
			setUploadVersionBlocking(false);
			setUploadVersionMessage('Mangler konfigurasjon for versjonssjekk.');
			return false;
		}

		Sentry.addBreadcrumb({
			category: 'external.version',
			message: 'Upload version check started',
			level: 'info',
			data: {
				command: VERSION_GATE_COMMAND,
			},
		});
		Sentry.captureMessage('Upload version check started', 'info');

		return runVersionGateCheck(desktopVersionUri)
			.then((response) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Upload version check completed',
					level: 'info',
					data: {
						command: VERSION_GATE_COMMAND,
						status: response.status,
					},
				});
				Sentry.captureMessage('Upload version check completed', 'info');
				return response;
			})
			.then((response) => {
				const isBlockingStatus =
					response.status === 'MAJOR_BLOCKING' || response.status === 'MINOR_BLOCKING';
				setUploadVersionBlocking(isBlockingStatus);
				setUploadVersionMessage(response.message ?? null);
				return isBlockingStatus;
			})
			.catch((error) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Upload version check failed',
					level: 'error',
					data: {
						command: VERSION_GATE_COMMAND,
						error: getErrorMessage(error),
					},
				});
				Sentry.captureMessage('Upload version check failed', 'error');
				setUploadVersionBlocking(false);
				setUploadVersionMessage(`Kunne ikke sjekke versjon akkurat nå. ${getErrorMessage(error)}`);
				return false;
			});
	}, [runVersionGateCheck]);

	useEffect(() => {
		void runStartupVersionCheck().finally(() => setIsCheckingStartupVersion(false));
	}, [runStartupVersionCheck]);

	const value = useMemo(() => ({
		startupVersionStatus,
		startupVersionMessage,
		startupVersionError,
		isCheckingStartupVersion,
		hasCheckedStartupVersion,
		isStartupBlocking,
		requiresManualLogin,
		uploadVersionBlocking,
		uploadVersionMessage,
		retryStartupVersionCheck,
		checkUploadVersionGate,
		canFetchStartupSecrets,
	}), [
		startupVersionStatus,
		startupVersionMessage,
		startupVersionError,
		isCheckingStartupVersion,
		hasCheckedStartupVersion,
		isStartupBlocking,
		requiresManualLogin,
		uploadVersionBlocking,
		uploadVersionMessage,
		canFetchStartupSecrets,
		retryStartupVersionCheck,
		checkUploadVersionGate,
	]);

	return (
		<VersionContext.Provider value={value}>
			{children}
		</VersionContext.Provider>
	);
};

export const useVersion = (): VersionContextType => {
	const context = useContext(VersionContext);
	if (!context) {
		throw new Error('useVersion must be used within a VersionProvider');
	}
	return context;
};
