/** Entry points the camera rig registers while mounted, so other code (click, Esc) can move the camera. */
export const rig: { flyToward?: (index: number) => void; back?: () => void } = {};
