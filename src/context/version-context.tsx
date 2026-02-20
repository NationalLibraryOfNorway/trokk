import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import * as Sentry from '@sentry/react';
import {StartupVersionStatus} from '@/model/secret-variables.ts';

interface DesktopVersionGateResponse {
	status: StartupVersionStatus;
	isBlocking: boolean;
	isPatch: boolean;
	message: string | null;
	currentVersion: string;
	latestVersion: string | null;
}

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

const getInvokeErrorMessage = (error: unknown): string => {
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object') {
		const invokeError = error as { message?: string; error?: string };
		if (invokeError.message) return invokeError.message;
		if (invokeError.error) return invokeError.error;
	}
	return String(error);
};

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

	const applyVersionResponse = useCallback((response: DesktopVersionGateResponse) => {
		const safeResponse = response as DesktopVersionGateResponse;
		setStartupVersionStatus(safeResponse.status);
		setStartupVersionMessage(safeResponse.message ?? null);
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
				command: 'check_desktop_version_gate',
			},
		});
		Sentry.captureMessage('Startup version check started', 'info');

		return invoke<DesktopVersionGateResponse>('check_desktop_version_gate', {desktopVersionUri})
			.then((response) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Startup version check completed',
					level: 'info',
					data: {
						command: 'check_desktop_version_gate',
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
						command: 'check_desktop_version_gate',
						error: getInvokeErrorMessage(error),
					},
				});
				Sentry.captureMessage('Startup version check failed', 'error');
				setStartupVersionStatus(null);
				setStartupVersionMessage(null);
				setStartupVersionError(`Kunne ikke sjekke versjon ved oppstart. ${getInvokeErrorMessage(error)}`);
				setHasCheckedStartupVersion(true);
				throw error;
			});
	}, [applyVersionResponse]);

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
				command: 'check_desktop_version_gate',
			},
		});
		Sentry.captureMessage('Upload version check started', 'info');

		return invoke<DesktopVersionGateResponse>('check_desktop_version_gate', {desktopVersionUri})
			.then((response) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Upload version check completed',
					level: 'info',
					data: {
						command: 'check_desktop_version_gate',
						status: response.status,
					},
				});
				Sentry.captureMessage('Upload version check completed', 'info');
				return response;
			})
			.then((response) => {
				const safeResponse = response as DesktopVersionGateResponse;
				const isBlockingStatus =
					safeResponse.status === 'MAJOR_BLOCKING' || safeResponse.status === 'MINOR_BLOCKING';
				setUploadVersionBlocking(isBlockingStatus);
				setUploadVersionMessage(safeResponse.message ?? null);
				return isBlockingStatus;
			})
			.catch((error) => {
				Sentry.addBreadcrumb({
					category: 'external.version',
					message: 'Upload version check failed',
					level: 'error',
					data: {
						command: 'check_desktop_version_gate',
						error: getInvokeErrorMessage(error),
					},
				});
				Sentry.captureMessage('Upload version check failed', 'error');
				setUploadVersionBlocking(false);
				setUploadVersionMessage(`Kunne ikke sjekke versjon akkurat nå. ${getInvokeErrorMessage(error)}`);
				return false;
			});
	}, []);

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
