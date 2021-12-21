import { Font } from 'three/examples/jsm/loaders/FontLoader';

import { Object3D } from "three";
import { __metadata } from "tslib";
import { Position } from "./Position";
import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier';
import { generateUUID } from "three/src/math/MathUtils";
import { Attack } from "./weapons/attacks/attack";

export abstract class GameObject {

    // private weapon: Weapon;
    private _uuid: string = generateUUID();
    public scale: number = 1;
    public shooting: boolean = false;
    public rotationSpeedX: number = 0.05;
    public rotationSpeedY: number = 0.01;
    public rotationSpeedZ: number = 0.02;
    public nametag!: THREE.Mesh;
    public velocity: number = 0.00;
    public baseVelocity: number = 0.00;
    public maxVelocity: number = 0.00;
    public acceleration: number = 0.00;
    public yuka!: any;
    public player!: GameObject;
    public hasBeenHit = false;

    protected _mesh: any = new Object3D();
        
    protected geometry: any;
    
    animateFunction: any;

    public get mesh(): THREE.Mesh {
        return this._mesh;
    }

    public get uuid(): string {
      return this._uuid;
    }

    public accelerate(active: boolean): void {
        if(this.velocity <= this.maxVelocity && this.velocity > 0) {
            //this.velocity = this.velocity + (active ? 1 : -1);
        }
    }

    getCenterPoint(mesh: any) {
        var geometry = mesh.geometry;
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        if(!geometry.boundingBox) {
            return center;
        }
        geometry.boundingBox.getCenter( center );
        mesh.localToWorld( center );
        return center;
    }

    abstract reloadTime(weaponIndex: number, reloadTime: number): void;

    animate(tick: number): void {      
      this.animateFunction();
    }

    onHit() {
      //console.log('Player hit!');
    }

        // obj - your object (THREE.Object3D or derived)
    // point - the point of rotation (THREE.Vector3)
    // axis - the axis of rotation (normalized THREE.Vector3)
    // theta - radian value of rotation
    // pointIsWorld - boolean indicating the point is in world coordinates (default = false)
    rotateAboutPoint(obj: THREE.Mesh, point: THREE.Vector3, axis: THREE.Vector3, theta: any, pointIsWorld: boolean = false){

      if(pointIsWorld && !!obj.parent){
          obj.parent.localToWorld(obj.position); // compensate for world coordinate
      }

      obj.position.sub(point); // remove the offset
      obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
      obj.position.add(point); // re-add the offset

      if(pointIsWorld && !!obj.parent){
          obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
      }

      // obj.rotateOnAxis(axis, theta); // rotate the OBJECT
    }

    abstract updatePosition(p: Position, sub: boolean): void;

    abstract attack(tick: number): Attack[];

    public static createShaderMaterial( color: string) {
      const tColor1: THREE.Color = new THREE.Color(color);
      const tColor2: THREE.Color = new THREE.Color('white');
      return new THREE.ShaderMaterial({
        uniforms: {
          color1: {
            value: tColor1
          },
          color2: {
            value: tColor1
          },
          u_time: { value: 0.00 },
          c: { value: 0.5 }
        },
        vertexShader: `
          varying vec2 vUv;
      
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,

        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float u_time;
          uniform float c;
          varying vec2 vUv;
          
          void main() {
            gl_FragColor = vec4(mix(color1, color1, vUv.y),1.0);
          }
        `,
        wireframe: true
      });
    }

    addNameTag(tag: THREE.Mesh) {
      this.nametag = tag;
     
    }

    static invertColor(hex: any) {
      if (hex.indexOf('#') === 0) {
          hex = hex.slice(1);
      }
      // convert 3-digit hex to 6-digits.
      if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length !== 6) {
          throw new Error('Invalid HEX color.');
      }
      // invert color components
      var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
          g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
          b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
      // pad each with zeros and return
      return '#' + this.padZero(r) + this.padZero(g) + this.padZero(b);
  }
  
  static padZero(str: any, len?: number) {
      len = len || 2;
      var zeros = new Array(len).join('0');
      return (zeros + str).slice(-len);
  }
    // vec4(mix(color1, vec3(color2.x + sin(u_time)  + c, color2.y + sin(u_time)  + c, color2.z + sin(u_time)) + c, vUv.y),1.0);
}