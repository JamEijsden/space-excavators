import { generateUUID } from "three/src/math/MathUtils";

export abstract class Attack {
    private _uuid = generateUUID();
    protected velocity: number = 0.001;
    protected geometry: any;
    protected _mesh: any;

    public get uuid() {
        return this._uuid;
    }

    public get mesh(): THREE.Mesh {
        return this._mesh;
    }

    abstract animate(tick?: number): void;
}