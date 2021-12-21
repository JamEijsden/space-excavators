import { Pistol } from './../weapons/pistol';
import { Shotgun } from './../weapons/shotgun';
import * as THREE from 'three';
import { GameObject } from '../game-object';
import { Position } from "../Position";
import { Attack } from '../weapons/attacks/attack';
import { Weapon } from '../weapons/weapons';
import { Vector3 } from 'three';


export class BasicShip extends GameObject {
    weapon: Weapon;
    fleeing: boolean = false;
    
    constructor(isPlayer: boolean, name: string = 'Enemy', color: string = 'red') {
        super();
        
        this.maxVelocity = 1
        this.acceleration =  0.2 / 3;

        if(isPlayer) {
            this.baseVelocity = 0.4;
            this.weapon = new Shotgun({color: color}); 
            this.animateFunction = (tick: number) => {
                // this.nametag.position.copy(this.mesh.position).add(new Vector3(0, 2, 2));
                this._mesh.material.uniforms.u_time.value += 0.01;
            };  
        } else {
            this.weapon = new Pistol({color: color});
            this.baseVelocity = 0.2 / 3;
            this.weapon.reloadTimeMS = 500;
            this.animateFunction = (tick: number) => {
                const timestamp = Date.now() * 0.005;
                // this._mesh.rotation.z += this.rotationSpeedX;
                this._mesh.material.uniforms.u_time.value += 0.02;
                this._mesh.lookAt(this.player.mesh.position);
                this.rotateAboutPoint(this._mesh, this.player.mesh.position, new THREE.Vector3(0, 0, 0.5), this.velocity / 20, true);
                const distanceFromPlayer: number = this.mesh.position.distanceTo(this.player.mesh.position);
                
                if(!this.fleeing && distanceFromPlayer >= 30) {
                    this.mesh.translateZ( this.velocity );
                } 
                // else if(distanceFromPlayer < 60 || (this.fleeing && distanceFromPlayer < 100)) {
                //     this.fleeing = !(distanceFromPlayer >= 70);
                //     this.mesh.translateX( -this.velocity);
                // }
            };
        }
        this.velocity = this.baseVelocity;
        this.geometry = new THREE.ConeGeometry(0.750, 2, 16);
        this.geometry.scale(this.scale, this.scale, this.scale);
        this.geometry.translate(0, .5, 0);
        this.geometry.rotateX(Math.PI / 2);
        this._mesh = new THREE.Mesh(this.geometry, GameObject.createShaderMaterial(color));
        this.mesh.name = name;
        this.mesh.localToWorld(new Vector3(1,1,1));
        this.mesh.add(this.weapon.mesh);

    }


    updatePosition(p: Position, sub: boolean): void {
        this._mesh.position[p] += this.velocity * ((sub ? 1 : -1));
    }

    attack(tick: number): Attack[] {
        // Direction of attack and where it spawns
        const attacks: Attack[] = this.weapon.trigger();
        attacks.forEach(a => {
            a.mesh.position.copy(this.mesh.position);
            a.mesh.quaternion.copy(this.mesh.quaternion);
        });
        
        return attacks;
    }

    reloadTime(weaponIndex: number, reloadTime: number): void {
        this.weapon.reloadTimeMS = reloadTime;
    }

}