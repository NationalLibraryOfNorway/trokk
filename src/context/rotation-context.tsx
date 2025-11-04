import {createContext, useContext, useState, useCallback, ReactNode, useRef} from 'react';
import {invoke} from '@tauri-apps/api/core';

export type ImageStatus = 'rotating' | 'reloading' | null;

interface RotationContextType {
    rotations: Map<string, number>;
    getRotation: (path: string) => number;
    rotateImage: (path: string, direction: 'clockwise' | 'counterclockwise') => void;
    isRotating: (path: string) => boolean;
    getImageStatus: (path: string) => ImageStatus;
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

    const getRotation = useCallback((path: string): number => {
        return rotations.get(path) || 0;
    }, [rotations]);

    const isRotating = useCallback((path: string): boolean => {
        return imageStatuses.get(path) === 'rotating';
    }, [imageStatuses]);

    const getImageStatus = useCallback((path: string): ImageStatus => {
        return imageStatuses.get(path) || null;
    }, [imageStatuses]);

    const saveRotation = useCallback(async (path: string, rotation: number) => {
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

            // Force image reload by updating cache buster
            setCacheBuster(Date.now());

            // Wait a bit for the image to reload, then clear status
            setTimeout(() => {
                setImageStatuses(prev => {
                    const updated = new Map(prev);
                    updated.delete(path);
                    return updated;
                });
            }, 500);

            // Clean up pending saves
            pendingSaves.current.delete(path);
        } catch (error) {
            console.error('Failed to rotate image:', error);
            // Revert on error
            const pendingRotation = pendingSaves.current.get(path);
            if (pendingRotation !== undefined) {
                setRotations(prev => {
                    const updated = new Map(prev);
                    updated.set(path, pendingRotation);
                    return updated;
                });
            }
            pendingSaves.current.delete(path);
            // Clear status on error
            setImageStatuses(prev => {
                const updated = new Map(prev);
                updated.delete(path);
                return updated;
            });
        }
    }, []);

    const rotateImage = useCallback((path: string, direction: 'clockwise' | 'counterclockwise') => {
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

    return (
        <RotationContext.Provider value={{rotations, getRotation, rotateImage, isRotating, getImageStatus, cacheBuster}}>
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

