export const LEFT_PANEL_DEFAULT = 20;
export const RIGHT_PANEL_DEFAULT = 20;
export const HIDDEN_SIZE = 1;

export const toggleLeftPanel = (sizes: number[]): number[] => {
    const [left, middle, right] = sizes;
    if (left === HIDDEN_SIZE) {
        // expand left panel
        return [
            LEFT_PANEL_DEFAULT,
            middle - LEFT_PANEL_DEFAULT + HIDDEN_SIZE,
            right
        ];
    } else {
        // hide left panel
        return [
            HIDDEN_SIZE,
            middle + left - HIDDEN_SIZE,
            right
        ];
    }
};

export const toggleRightPanel = (sizes: number[]): number[] => {
    const [left, middle, right] = sizes;
    if (right === HIDDEN_SIZE) {
        // expand right panel
        return [
            left,
            middle - RIGHT_PANEL_DEFAULT + HIDDEN_SIZE,
            RIGHT_PANEL_DEFAULT
        ];
    } else {
        // hide right panel
        return [
            left,
            middle + right - HIDDEN_SIZE,
            HIDDEN_SIZE
        ];
    }
};
