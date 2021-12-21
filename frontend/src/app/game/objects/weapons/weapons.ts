import * as THREE from 'three';
import { Attack } from './attacks/attack';
import { Bullet } from './attacks/bullet';
export abstract class Weapon {
    protected scale: number = 0.5;
    public numberOfProjectiles = 1;
    protected _reloading: boolean = false;
    public reloadTimeMS: number = 100;
    protected createAttack: any = (material: THREE.Material) => {
        const attacks = [];
        for(let i = 0; i < this.numberOfProjectiles; i++) {
            attacks.push(new Bullet(material));
        }
        return attacks;
    };
    // bulletGeometry: THREE.BufferGeometry;
    // bulletMesh: THREE.Mesh;
    protected _mesh: any;

    public get mesh(): THREE.Mesh {
        return this._mesh;
    }

    public get reloading() {
        return this._reloading;
    }

    abstract animate(tick?: number): void;

    abstract trigger(tick?: number): Attack[];
}