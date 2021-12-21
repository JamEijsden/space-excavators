import { Attack } from './attacks/attack';
import { Weapon } from "./weapons";
import * as THREE from 'three';

export class Shotgun extends Weapon {
    constructor(conf: {color: string}) {
        super();
        this.numberOfProjectiles = 5;
        const geometry = new THREE.CylinderGeometry(1, 0.5, 2);
        geometry.scale(this.scale, this.scale, this.scale)
        geometry.rotateX(Math.PI / 2);
        this._mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            color: conf.color
          }));
        this.reloadTimeMS = 400;
        this.reload();
    }

    animate(tick?: number): void {
        
    }

    trigger(tick?: number): Attack[] {
        if(!this.reloading) {
            const attacks: Attack[] = this.createAttack(this.mesh.material);
            this.reload();
            return attacks;
        }
        return [];   
    }
    reload() {
        this._reloading = true;
        setTimeout(() => this._reloading = false, this.reloadTimeMS);
    }
}