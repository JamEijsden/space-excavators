export interface PlayerState {
    health: number;
    score: number;
    shooting: boolean;
    position: {x: number, y: number, z: number},
    rotation: {x: number, y: number, z: number},
}