import {createContext, useContext, useState, useCallback, ReactNode, useRef} from 'react';
import {invoke} from '@tauri-apps/api/core';

export type ImageStatus = 'rotating' | 'reloading' | null;

interface RotationContextType {
    rotateImage: (path: string, direction: 'clockwise' | 'counterclockwise') => void;
    isRotating: (path: string) => boolean;
    getImageStatus: (path: string) => ImageStatus;
    hasAnyRotating: () => boolean;
    cacheBuster: number;
    getFileCacheBuster: (path: string) => number;
}

const RotationContext = createContext<RotationContextType | undefined>(undefined);

export const RotationProvider = ({children}: {children: ReactNode}) => {
    const [imageStatuses, setImageStatuses] = useState<Map<string, ImageStatus>>(new Map());
    const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
    const [fileCacheBusters, setFileCacheBusters] = useState<Map<string, number>>(new Map());
    const activeRotations = useRef<Map<string, Promise<void>>>(new Map());

    const isRotating = useCallback((path: string): boolean => {
        return imageStatuses.get(path) === 'rotating';
    }, [imageStatuses]);

    const getImageStatus = useCallback((path: string): ImageStatus => {
        return imageStatuses.get(path) || null;
    }, [imageStatuses]);

    const hasAnyRotating = useCallback((): boolean => {
        return Array.from(imageStatuses.values()).some(status => status === 'rotating' || status === 'reloading');
    }, [imageStatuses]);

    const getFileCacheBuster = useCallback((path: string): number => {
        return fileCacheBusters.get(path) || cacheBuster;
    }, [fileCacheBusters, cacheBuster]);

    const saveRotation = useCallback(async (path: string, rotation: number) => {
        // Wait for any active rotation to complete first
        const existingRotation = activeRotations.current.get(path);
        if (existingRotation) {
            try {
                await existingRotation;
            } catch {
                // Ignore errors from previous rotation, we'll try again
            }
        }

        const rotationPromise = (async () => {
            try {
                // Set rotating status
                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.set(path, 'rotating');
                    return updated;
                });

                // Rotate the image file
                // Backend handles: EXIF update + WebP thumbnail/preview regeneration
                await invoke('rotate_image', {
                    filePath: path,
                    rotation: rotation
                });

                // Update cache buster to force browser to reload the new images
                // This is necessary because browsers cache images by URL
                const newCacheBuster = Date.now();
                setCacheBuster(newCacheBuster);

                // Mark this file (and its derived WebP files) as needing reload
                setFileCacheBusters(prev => {
                    const updated = new Map(prev);
                    // Single cache buster for the file - components will use this
                    // for both the original and its WebP derivatives
                    updated.set(path, newCacheBuster);
                    return updated;
                });

                // Clear rotating status
                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.delete(path);
                    return updated;
                });
            } catch (error) {
                console.error('Failed to rotate image:', error);
                // Clear status on error
                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.delete(path);
                    return updated;
                });
            } finally {
                // Clean up active rotation tracking
                activeRotations.current.delete(path);
            }
        })();

        activeRotations.current.set(path, rotationPromise);
        await rotationPromise;
    }, []);

    const rotateImage = useCallback((path: string, direction: 'clockwise' | 'counterclockwise') => {
        // Prevent rotation if one is already in progress
        if (activeRotations.current.has(path)) {
            console.debug('Rotation already in progress for:', path);
            return;
        }

        const rotationDelta = direction === 'clockwise' ? 90 : -90;
        // Convert to positive rotation value
        const newRotation = ((rotationDelta % 360) + 360) % 360;

        // No immediate UI update - just start rotating the file
        // The EXIF orientation will be applied when the image reloads
        saveRotation(path, newRotation);
    }, [saveRotation]);


    return (
        <RotationContext.Provider value={{ rotateImage, isRotating, getImageStatus, hasAnyRotating, cacheBuster, getFileCacheBuster}}>
            {children}
        </RotationContext.Provider>
    );
};

export const useRotation = () => {
    const context = useContext(RotationContext);
    if (!context) {
        throw new Error('useRotation must be used within a RotationProvider');
    }
    return context;
};

