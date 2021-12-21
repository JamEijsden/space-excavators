import { Attack } from "./attack";
import * as THREE from 'three';

export class Bullet extends Attack {
    
    constructor(material: THREE.Material) {
       super();
       this.velocity = 0.7;
       this._mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4), material);
    
    }

    animate(tick: number): void {
        this.mesh.translateZ(this.velocity);
    }
}