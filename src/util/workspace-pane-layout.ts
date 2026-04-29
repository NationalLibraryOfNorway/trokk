export type WorkspacePaneSizes = [number, number, number];

export const defaultWorkspacePaneSizes: WorkspacePaneSizes = [22, 48, 30];
export const minimumWorkspacePaneSizes: WorkspacePaneSizes = [16, 38, 22];

const workspacePaneCount = 3;
const totalWorkspacePaneSize = 100;
const adjustmentPriority = [1, 0, 2] as const;

const cloneWorkspacePaneSizes = (sizes: readonly number[]): WorkspacePaneSizes => {
    return [sizes[0], sizes[1], sizes[2]];
};

const sumWorkspacePaneSizes = (sizes: readonly number[]) => {
    return sizes.reduce((sum, size) => sum + size, 0);
};

export const areWorkspacePaneSizesEqual = (
    left: readonly number[],
    right: readonly number[],
    tolerance = 0.01,
) => {
    return left.length === workspacePaneCount
        && right.length === workspacePaneCount
        && left.every((size, index) => Math.abs(size - right[index]) <= tolerance);
};

export const normalizeWorkspacePaneSizes = (
    sizes: readonly number[] | null | undefined,
): WorkspacePaneSizes => {
    if (!Array.isArray(sizes) || sizes.length !== workspacePaneCount) {
        return cloneWorkspacePaneSizes(defaultWorkspacePaneSizes);
    }

    const safeSizes = sizes.map((size) => {
        return Number.isFinite(size) ? Math.max(0, size) : 0;
    });

    const initialTotal = sumWorkspacePaneSizes(safeSizes);
    if (initialTotal <= 0) {
        return cloneWorkspacePaneSizes(defaultWorkspacePaneSizes);
    }

    const normalized = safeSizes.map((size) => {
        return (size / initialTotal) * totalWorkspacePaneSize;
    });

    const clamped = normalized.map((size, index) => {
        return Math.max(minimumWorkspacePaneSizes[index], size);
    });

    let overflow = sumWorkspacePaneSizes(clamped) - totalWorkspacePaneSize;
    if (overflow > 0) {
        for (const index of adjustmentPriority) {
            const available = clamped[index] - minimumWorkspacePaneSizes[index];
            if (available <= 0) {
                continue;
            }

            const reduction = Math.min(available, overflow);
            clamped[index] -= reduction;
            overflow -= reduction;

            if (overflow <= 0.001) {
                break;
            }
        }
    }

    if (overflow > 0.001) {
        return cloneWorkspacePaneSizes(defaultWorkspacePaneSizes);
    }

    const remainder = totalWorkspacePaneSize - sumWorkspacePaneSizes(clamped);
    clamped[1] += remainder;

    return cloneWorkspacePaneSizes(clamped.map((size) => {
        return Number(size.toFixed(3));
    }));
};
