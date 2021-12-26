import { generateUUID } from "three/src/math/MathUtils";

export abstract class Attack {
    private _uuid = generateUUID();
    private _playerUUID!: string; 
    protected velocity: number = 0.001;
    protected geometry: any;
    protected _mesh: any;

    public get uuid() {
        return this._uuid;
    }

    public get playerUUID() {
        return this._playerUUID;
    }

    public set playerUUID(uuid: string) {
        this._playerUUID = uuid;
    }

    public get mesh(): THREE.Mesh {
        return this._mesh;
    }

    abstract animate(tick?: number): void;
}