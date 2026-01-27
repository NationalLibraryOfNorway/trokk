// Model for tracking image rotations
export interface ImageRotation {
    path: string;
    rotation: number; // 0, 90, 180, 270
}

export interface RotationState {
    rotations: Map<string, number>;
}

