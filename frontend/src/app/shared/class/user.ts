import { PlayerState } from './player-state';
import { generateUUID } from "three/src/math/MathUtils";

export class User {
    uuid: string = generateUUID();
    username: string;
    color: string;
    state: PlayerState;

    constructor(username: string = 'Jaam', color: string = '#00c000') {
        this.username = username;
        this.color =color;
        this.state = {
            health: 100,
            score: 0,
            shooting: false,
            position: {
              x: 0,
              y: 0,
              z: 0,
            },
            rotation: {
              x: 0,
              y: 0,
              z: 0,
            }
        };
    }

}