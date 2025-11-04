import {createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect} from 'react';
import {invoke} from '@tauri-apps/api/core';

export type ImageStatus = 'rotating' | 'reloading' | null;

interface RotationContextType {
    rotations: Map<string, number>;
    getRotation: (path: string) => number;
    rotateImage: (path: string, direction: 'clockwise' | 'counterclockwise') => void;
    isRotating: (path: string) => boolean;
    getImageStatus: (path: string) => ImageStatus;
    hasAnyRotating: () => boolean;
    cacheBuster: number;
}

const RotationContext = createContext<RotationContextType | undefined>(undefined);

const ROTATION_DEBOUNCE_MS = 500; // Wait 500ms after last rotation before saving

export const RotationProvider = ({children}: {children: ReactNode}) => {
    const [rotations, setRotations] = useState<Map<string, number>>(new Map());
    const [imageStatuses, setImageStatuses] = useState<Map<string, ImageStatus>>(new Map());
    const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const pendingSaves = useRef<Map<string, number>>(new Map());
    const activeRotations = useRef<Map<string, Promise<void>>>(new Map());

    const getRotation = useCallback((path: string): number => {
        return rotations.get(path) || 0;
    }, [rotations]);

    const isRotating = useCallback((path: string): boolean => {
        return imageStatuses.get(path) === 'rotating';
    }, [imageStatuses]);

    const getImageStatus = useCallback((path: string): ImageStatus => {
        return imageStatuses.get(path) || null;
    }, [imageStatuses]);

    const hasAnyRotating = useCallback((): boolean => {
        return Array.from(imageStatuses.values()).some(status => status === 'rotating' || status === 'reloading');
    }, [imageStatuses]);

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

                // Rotate the actual image file in the background
                await invoke('rotate_image', {
                    filePath: path,
                    rotation: rotation
                });

                // Set reloading status
                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.set(path, 'reloading');
                    return updated;
                });

                // Wait a bit to ensure file system writes complete
                await new Promise(resolve => setTimeout(resolve, 300));

                // Force image reload by updating cache buster
                setCacheBuster(Date.now());

                // Wait for images to reload, then clear status
                await new Promise(resolve => setTimeout(resolve, 700));

                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.delete(path);
                    return updated;
                });

                // Reset rotation to 0 since the backend physically rotated the file
                setRotations(prev => {
                    const updated = new Map(prev);
                    updated.set(path, 0);
                    return updated;
                });

                // Clean up pending saves
                pendingSaves.current.delete(path);
            } catch (error) {
                console.error('Failed to rotate image:', error);
                // Revert rotation on error
                setRotations(prev => {
                    const updated = new Map(prev);
                    const currentRotation = updated.get(path) || 0;
                    // Revert by rotating back
                    const revertedRotation = (currentRotation - rotation + 360) % 360;
                    updated.set(path, revertedRotation);
                    return updated;
                });
                pendingSaves.current.delete(path);
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
            console.log('Rotation already in progress for:', path);
            return;
        }

        const currentRotation = rotations.get(path) || 0;
        const rotationDelta = direction === 'clockwise' ? 90 : -90;
        const newRotation = (currentRotation + rotationDelta + 360) % 360;

        // Update UI immediately
        setRotations(prev => {
            const updated = new Map(prev);
            updated.set(path, newRotation);
            return updated;
        });

        // Store the pending save rotation
        pendingSaves.current.set(path, newRotation);

        // Clear existing debounce timer for this path
        const existingTimer = debounceTimers.current.get(path);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounce timer
        const timer = setTimeout(() => {
            saveRotation(path, newRotation);
            debounceTimers.current.delete(path);
        }, ROTATION_DEBOUNCE_MS);

        debounceTimers.current.set(path, timer);
    }, [rotations, saveRotation]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            // Clear all debounce timers on unmount
            debounceTimers.current.forEach(timer => clearTimeout(timer));
            debounceTimers.current.clear();
        };
    }, []);

    return (
        <RotationContext.Provider value={{rotations, getRotation, rotateImage, isRotating, getImageStatus, hasAnyRotating, cacheBuster}}>
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

