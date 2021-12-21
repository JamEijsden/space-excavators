import { GameObject } from "./objects/game-object";
import { Attack } from "./objects/weapons/attacks/attack";

export class GameState {
    public enemies: Map<string, GameObject> = new Map<string, GameObject>();
    public enemyAttacks: Map<string, Attack> = new Map<string, Attack>();

    public players: Map<string, GameObject> = new Map<string, GameObject>();
    public playerAttacks: Map<string, Attack> = new Map<string, Attack>();
}