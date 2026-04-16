import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import * as Sentry from '@sentry/react';
import {StartupVersionStatus} from '@/model/version-status.ts';
import {
	DesktopVersionGateResponse,
	evaluateDesktopVersionGate,
	fetchLatestDesktopVersion,
} from '@/lib/version-gate.ts';
import {getErrorMessage} from '@/lib/utils.ts';

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

const VERSION_GATE_SENTRY_LABEL = 'frontend_desktop_version_gate';

export function VersionProvider({children}: { children: ReactNode }) {
	const [startupVersionStatus, setStartupVersionStatus] = useState<StartupVersionStatus | null>(null);
	const [startupVersionMessage, setStartupVersionMessage] = useState<string | null>(null);
	const [startupVersionError, setStartupVersionError] = useState<string | null>(null);
	const [isCheckingStartupVersion, setIsCheckingStartupVersion] = useState<boolean>(true);
	const [hasCheckedStartupVersion, setHasCheckedStartupVersion] = useState<boolean>(false);
	const [uploadVersionBlocking, setUploadVersionBlocking] = useState<boolean>(false);
	const [uploadVersionMessage, setUploadVersionMessage] = useState<string | null>(null);

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

		let fetchError: string | undefined;
		let responseStatus: StartupVersionStatus | undefined;

		Sentry.addBreadcrumb({
			category: 'external.version',
			message: 'Startup version check started',
			level: 'info',
			data: { command: VERSION_GATE_SENTRY_LABEL },
		});

		return runVersionGateCheck(desktopVersionUri)
			.then((response) => {
				responseStatus = response.status;
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Startup version check completed',
					level: 'info',
					data: { command: VERSION_GATE_SENTRY_LABEL, status: response.status },
				});
				return response;
			})
			.then(applyVersionResponse)
			.catch((error) => {
				fetchError = getErrorMessage(error);
				setStartupVersionStatus(null);
				setStartupVersionMessage(null);
				setStartupVersionError(`Kunne ikke sjekke versjon ved oppstart. ${fetchError}`);
				setHasCheckedStartupVersion(true);
			})
			.finally(() => {
				Sentry.captureMessage(
					`Startup version check ${fetchError ? 'failed' : 'completed'}`,
					{
						level: fetchError ? 'error' : 'info',
						tags: { category: 'external.version' },
						extra: {
							command: VERSION_GATE_SENTRY_LABEL,
							...(responseStatus && { status: responseStatus }),
							...(fetchError && { error: fetchError }),
						},
					},
				);
			});
	}, [applyVersionResponse, runVersionGateCheck]);

	const retryStartupVersionCheck = useCallback(async () => {
		setIsCheckingStartupVersion(true);
		await runStartupVersionCheck()
			.finally(() => setIsCheckingStartupVersion(false));
	}, [runStartupVersionCheck]);

	const checkUploadVersionGate = useCallback(async (): Promise<boolean> => {
		const desktopVersionUri = getDesktopVersionUri();
		if (!desktopVersionUri) {
			setUploadVersionBlocking(false);
			setUploadVersionMessage('Mangler konfigurasjon for versjonssjekk.');
			return false;
		}

		let fetchError: string | undefined;
		let responseStatus: StartupVersionStatus | undefined;

		Sentry.addBreadcrumb({
			category: 'external.version',
			message: 'Upload version check started',
			level: 'info',
			data: { command: VERSION_GATE_SENTRY_LABEL },
		});

		return runVersionGateCheck(desktopVersionUri)
			.then((response) => {
				responseStatus = response.status;
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
				fetchError = getErrorMessage(error);
				setUploadVersionBlocking(true);
				setUploadVersionMessage(`Kunne ikke sjekke versjon akkurat nå. ${fetchError}`);
				return true;
			})
			.finally(() => {
				Sentry.captureMessage(
					`Upload version check ${fetchError ? 'failed' : 'completed'}`,
					{
						level: fetchError ? 'error' : 'info',
						tags: { category: 'external.version' },
						extra: {
							command: VERSION_GATE_SENTRY_LABEL,
							...(responseStatus && { status: responseStatus }),
							...(fetchError && { error: fetchError }),
						},
					},
				);
			});
	}, [runVersionGateCheck]);

	useEffect(() => {
		void runStartupVersionCheck().finally(() => setIsCheckingStartupVersion(false));
	}, [runStartupVersionCheck]);

	const value = useMemo(() => {
		const isStartupBlocking =
			startupVersionStatus === 'MAJOR_BLOCKING' || startupVersionStatus === 'MINOR_BLOCKING';
		const requiresManualLogin = startupVersionStatus === 'PATCH_AVAILABLE';
		const canFetchStartupSecrets =
			hasCheckedStartupVersion && !isCheckingStartupVersion && !startupVersionError && !isStartupBlocking;

		return {
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
		};
	}, [
		startupVersionStatus,
		startupVersionMessage,
		startupVersionError,
		isCheckingStartupVersion,
		hasCheckedStartupVersion,
		uploadVersionBlocking,
		uploadVersionMessage,
		retryStartupVersionCheck,
		checkUploadVersionGate,
	]);

	return (
		<VersionContext.Provider value={value}>
			{children}
		</VersionContext.Provider>
	);
}

export const useVersion = (): VersionContextType => {
	const context = useContext(VersionContext);
	if (!context) {
		throw new Error('useVersion must be used within a VersionProvider');
	}
	return context;
};
