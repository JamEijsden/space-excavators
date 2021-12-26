import { GameService } from '../../_services/game.service';
import { GameState } from './../game-state';
import { Position } from './../objects/Position';
import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { GameObject } from '../objects/game-object';
import { BasicShip } from '../objects/ships/basic-ship';
import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import * as Stats from 'three/examples/jsm/libs/stats.module';
import * as YUKA from 'yuka';
import { MouseButton } from './MouseButton';
import { Attack } from '../objects/weapons/attacks/attack';
import { Debounce } from 'lodash-decorators';
import StarrySkyShader from './starry-sky-shader';
import { debounce, takeUntil } from 'rxjs/operators';
import { User } from 'src/app/shared/class/user';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Subject } from 'rxjs/internal/Subject';
import { interval } from 'rxjs';
import { Vehicle } from 'yuka';
import { ActivatedRoute, Router } from '@angular/router';
import { Enemy } from 'src/app/shared/class/enemy';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, AfterViewInit, OnDestroy {

  private ngDestroy: Subject<boolean> = new Subject(); 

  private state: GameState = new GameState();

  @ViewChild('canvas')
  private canvasRef!: ElementRef;

  @Input() public cameraZ: number = 3000;

  @Input() public fieldOfView: number = 2;

  @Input('nearClipping') public nearClippingPlane: number = 1;

  @Input('farClipping') public farClippingPlane: number = this.cameraZ * 2;

  private keysPressed: Map<String, Function> = new Map(); 

  private stats!: Stats.default;
  private clock = new THREE.Clock();
  private time = new YUKA.Time();
  private delta = 0;
  // 30 fps
  FPS_30 = 1 / 30;
  FPS_60 = 1 / 60;
  FPS_144 = 1 / 144;

  private camera!: THREE.PerspectiveCamera;
  private entityManager: YUKA.EntityManager = new YUKA.EntityManager();

  controls: {mouse: THREE.Vector2, buttonsPressed: Set<number>} = {
    mouse: new THREE.Vector2(),
    buttonsPressed: new Set<number>()
  }
  plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster = new THREE.Raycaster();
  pointOfIntersection = new THREE.Vector3();
  composer!: EffectComposer;
  marker!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | THREE.Line;
  bloomPass!: UnrealBloomPass;
  viewportSize!: { width: number; height: number; };
  skyBox!: THREE.Mesh<THREE.SphereGeometry, THREE.Material>;
  
  // GUI
  gui!: GUI;
  bloomFolder!: GUI;
  enemyFolder!: GUI;


  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private loader = new THREE.TextureLoader();
 
  private player: GameObject;
  private isHost: boolean = false;
  loading = false;

  private renderer!: THREE.WebGLRenderer;
  
  private fontLoader: FontLoader = new FontLoader();
  private font!: Font;

  private bloomParams = {
    exposure: 11,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0
  };

  // Enemy props 
  private spawnRateMS = 5000;
  private reloadTimeMS = 500;

  private scene!: THREE.Scene;
  private gameObjects: THREE.Group = new THREE.Group();

  private players: THREE.Group = new THREE.Group();
  private enemies: THREE.Group = new THREE.Group();

  private attacks: THREE.Group = new THREE.Group();
  private playerAttacks: THREE.Group = new THREE.Group();
  private enemyAttacks: THREE.Group = new THREE.Group();

  constructor(private _game: GameService, private router: Router) { 
    this.player = new BasicShip(true, this._game.user.username, this._game.user.color);
  }

  ngOnInit(): void {
  }

  initPlayers() {
    this.addPlayer(this.player);
    this._game.playerSubject
    .pipe(takeUntil(this.ngDestroy))
    .subscribe((playerData: any) => {
      if(playerData.join) {
        this.addOtherPlayer(playerData.user);
      } else {
        this.removeOtherPlayer(playerData.user);
      }
    }); 

    if(!this._game.host) {
      this._game.players.forEach(p => 
        this.addOtherPlayer(p)
      );
    }
    this._game.gameState
      .pipe(takeUntil(this.ngDestroy))
      .subscribe(state => {
        // console.log('gameState', state.players, this.state);
        state.enemies
        .forEach((e: Enemy) => {
          if(!this.state.enemies.has(e.uuid)) {
            const {x, y, z} = e.state.position;
            const enemy = new BasicShip(false);
            enemy.uuid = e.uuid;
            enemy.mesh.position.set(x, y, z);
            this.addEnemy(enemy);
          }
        });

        state.hitEnemies.forEach((uuid: string) => {
          this.removeEnemy(uuid);
        });

        state.players
        .filter((p: User) => p.uuid !== this.player.uuid)
        .forEach((p: User) => {
          const playerObject: GameObject | undefined = this.state.players.get(p.uuid);
          
          if(!!playerObject) {
            
            playerObject.shooting = p.state.shooting;
            playerObject.mesh.position.copy(
              new THREE.Vector3(p.state.position.x, p.state.position.y, p.state.position.z)
            );
            playerObject.mesh.rotation.copy(
              new THREE.Euler(p.state.rotation.x, p.state.rotation.y, p.state.rotation.z)
            );
          }       
        });
      });
    interval(100)
      .pipe(takeUntil(this.ngDestroy))
      .subscribe(() => {
        this.sendPlayerUpdate();
      });
  }

  ngAfterViewInit() {
    if(!this._game.isConnected()) {
      this.router.navigate([''])
    } else {
      this.fontLoader.load(
        '/assets/font/Origin_Tech.json',
        (font: Font) => {
          this.font = font;
          console.log('Font loaded', font);
          this.initPlayers();
          this.createScene();
          this.startRenderingLoop();
        },
        (xhr) => {},
        (err) => console.log('Faile to load font, ', err)
      );
    }
  }

  sendPlayerUpdate() {
    const {x, y, z} = this.player.mesh.position;
    const playedData = {
      health: 100,
      score: 0,
      shooting: this.player.shooting,
      position: {x: x, y: y, z: z},
      rotation: {x: this.player.mesh.rotation.x, y: this.player.mesh.rotation.y, z: this.player.mesh.rotation.z}
    };
    if(this._game.host) {
      
    }
    this._game.sendPlayerUpdate( 
      {
        state: playedData,
        hitEnemies: Array.from(this.state.hitEnemies.keys())
      }
    );
    this.state.hitEnemies.clear();
  }


  private createScene() {
    this.loader  = new THREE.TextureLoader();

    //* Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.attacks.add(this.playerAttacks);
    this.attacks.add(this.enemyAttacks);
    this.gameObjects.add(this.attacks);

    this.gameObjects.add(this.players);
    this.gameObjects.add(this.enemies);
    this.scene.add(this.gameObjects);
    
    //*Camera
    let aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPlane,
      this.farClippingPlane
    )
    this.camera.position.z = this.cameraZ;
    this.createSkyDome();
    this.viewportMatrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    const grid = new THREE.GridHelper( 400, 25 );
    grid.rotateX(Math.PI / 2)
    this.scene.add( grid );
    
    //setTimeout(() => this.addEnemy(new BasicShip(false)), this.spawnRateMS);
    
  }
  addGUI() {
    this.gui = new GUI()
    this.bloomFolder = this.gui.addFolder('Bloom')
    this.bloomFolder.add(this.bloomParams, 'exposure', 0.1, 2).onChange(v => this.renderer.toneMappingExposure = Math.pow( v, 4.0 ));
    this.bloomFolder.add(this.bloomParams, 'bloomStrength', 0, 3).onChange(v =>this.bloomPass.strength = v);
    this.bloomFolder.add(this.bloomParams, 'bloomThreshold', 0, 1).onChange(v =>this.bloomPass.threshold = v);
    this.bloomFolder.add(this.bloomParams, 'bloomRadius', 0, 1).onChange(v =>this.bloomPass.radius = v);

    this.enemyFolder = this.gui.addFolder('Enemy')
    this.enemyFolder.add(this, 'spawnRateMS', 1000, 15000).onChange(v => this.spawnRateMS = v);
    this.enemyFolder.add(this, 'reloadTimeMS', 10, 1000).onChange(v =>this.reloadTimeMS = v);
  } 

  createSkyDome() {
    const geometry = new THREE.SphereGeometry(this.cameraZ, 500, 500);  
    const uniforms = {  
      u_texture: { type: 't', value: this.loader.load('/assets/space.jpg') }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: {
        skyRadius: { value: this.cameraZ },
        // env_c1: { value: new THREE.Color("#0d1a2f") },
        // env_c2: { value: new THREE.Color("#0f8682") },
        env_c1: { value: new THREE.Color("#000000") },
        env_c2: { value: new THREE.Color("#060006") },
        noiseOffset: { value: new THREE.Vector3(100.01, 100.01, 100.01) },
        starSize: { value: 0.00006 },
        starDensity: { value: 0.07 },
        clusterStrength: { value: 0.01 },
        clusterSize: { value: 0.01 },
      },
      vertexShader: StarrySkyShader.vertexShader,
      fragmentShader: StarrySkyShader.fragmentShader,
      side: THREE.DoubleSide,
    });
  
    this.skyBox = new THREE.Mesh(geometry, material);
    //this.skyBox.position.copy(this.camera.position);
    this.scene.add(this.skyBox);  
  }
  
  addOtherPlayer(user: User) {
    const player: GameObject = new BasicShip(true, user.username, user.color);
    player.mesh.uuid = user.uuid;
    this.addPlayer(player, true);
  }

  removeOtherPlayer(user: User){
    const player: GameObject | undefined = this.state.players.get(user.uuid);
    if(!!player) {
      this.players.remove(player.mesh);
      this.state.players.delete(user.uuid);
    }
  }

  addPlayer(player: GameObject, addToState = false) {

    // const geometry = new TextGeometry(player.mesh.name, {
    //   font: this.font,
    //   size: 2,
    //   height: 5,
    //   curveSegments: 12,      
    //   bevelThickness: 0.1,
    //   bevelSize: 0.1,
    //   bevelEnabled: false
    // });
    // const txt_mat = new THREE.MeshBasicMaterial({color:0x0c0000});
    // const txt_mesh = new THREE.Mesh(geometry, txt_mat);
    // player.addNameTag(txt_mesh);
    // this.scene.add(txt_mesh);
    if(addToState) {
      this.state.players.set(player.mesh.uuid, player);
    }
    const vehicle: Vehicle = new Vehicle();
    vehicle.maxSpeed = player.maxVelocity;
    vehicle.setRenderComponent(player.mesh, this.sync);
    this.player.vehicle = vehicle;
    this.players.add(player.mesh);
    this.entityManager.add(vehicle);
    console.log('Player added', addToState);
  }
  
  private e!: GameObject;
  addEnemy(enemy: GameObject) {
    this.e = enemy;
    this.e.reloadTime(0, this.reloadTimeMS);
    enemy.player = this.player;
    this.state.enemies.set(enemy.uuid, enemy);
    this.enemies.add(enemy.mesh);
    
    const vehicle = new YUKA.Vehicle();
    vehicle.maxSpeed = 3;
    vehicle.position.z = 0;
    vehicle.setRenderComponent(enemy.mesh, this.sync);
    const pursuitBehavior = new YUKA.PursuitBehavior( this.player.vehicle, 2 );
    vehicle.steering.add( pursuitBehavior );
    this.entityManager.add(vehicle);
  //setTimeout(() => this.addEnemy(new BasicShip(false)), this.spawnRateMS);
  }

  removeEnemy(uuid: string) {
    const e = this.state.enemies.get(uuid);
    if(!!e) {
      this.enemies.remove(e.mesh);
      this.state.enemies.delete(uuid);
      this.state.hitEnemies.delete(uuid);
    }
  }

  sync(entity: any, renderCompoent: any) {
    renderCompoent.matrix.copy(entity.worldMatrix);
  }
  
  private getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  private startRenderingLoop() {
    //* Renderer
    // Use canvas element in template
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    // this.scene.add( new THREE.AmbientLight( 0x404040 ) );
    this.addCrosshair()

    this.addBloomPass();
    this.addGUI();
    this.stats = Stats.default();
    document.body.appendChild(this.stats.dom)
    window.addEventListener('resize', this.onWindowResize );
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.viewportSize = this.getViewPortWidth();
    this._game.initiateTimeSync();
    this.animate();
  }

  addCrosshair() {
    const points = [];
    points.push( new THREE.Vector3( - 1, 0, 5 ) );
    points.push( new THREE.Vector3( 0, 0, 5 ) );
    points.push( new THREE.Vector3( 0, 1, 5 ) );
    points.push( new THREE.Vector3( 0, 0, 5 ) );
    points.push( new THREE.Vector3( 1, 0, 5 ) );
    points.push( new THREE.Vector3( 0, 0, 5 ) );
    points.push( new THREE.Vector3( 0, -1, 5 ) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const material = new THREE.LineBasicMaterial({
      color: 'green'
    });
    this.marker = new THREE.Line( geometry, material );
    geometry.scale(1, 1, 1);
    this.scene.add(this.marker);
  }

  private addBloomPass() {
    this.bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 
      this.bloomParams.bloomStrength,
      this.bloomParams.bloomRadius,
      this.bloomParams.bloomThreshold 
    );

    const renderScene = new RenderPass( this.scene, this.camera );
    this.composer = new EffectComposer( this.renderer);
    this.composer.addPass( renderScene );
    this.composer.addPass( this.bloomPass );
  }

  private getViewPortWidth(): { width: number, height: number } {
    const vFOV = THREE.MathUtils.degToRad( this.camera.fov ); // convert vertical fov to radians
    const height = 2 * Math.tan( vFOV / 2 ) * this.cameraZ; // visible height
    const width = height * this.camera.aspect;        // visible width
    return {width: width, height: height};
  }

  private viewportMatrix!: THREE.Matrix4;
  private isOutsideViewPort(object: THREE.Mesh) {
    const frustum = new THREE.Frustum()
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse))
    return !frustum.containsPoint(object.position);
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.delta += this.clock.getDelta();
    const deltaTime = this.time.update().getDelta();
    if (this.delta  > this.FPS_30) {
      this.render();
      //this.composer.render();
      this.stats.update();
      this._game.updateLatency(this.delta);
    }
    this.entityManager.update(deltaTime);
      
  }

  private render(): void {
    this.player.accelerate(this.keysPressed.size > 0);
    this.player.animate(0);

    const eAttacksToRemove: Attack[] = [];
    this.state.enemyAttacks.forEach(a => {
      if(this.isOutsideViewPort(a.mesh)) {
        eAttacksToRemove.push(a);
      } else {
        a.animate(this.delta)
      }
    });

    const localAttacksToRemove: Attack[] = [];
    this.state.localPlayerAttacks.forEach(a => { 
      if(this.isOutsideViewPort(a.mesh)) {
        localAttacksToRemove.push(a);
      } else {
        a.animate(this.delta);
      }
     });

    const pAttacksToRemove: Attack[] = [];
    this.state.playerAttacks.forEach(a => { 
      if(this.isOutsideViewPort(a.mesh)) {
        pAttacksToRemove.push(a);
      } else {
        a.animate(this.delta);
      }
     });
     
     localAttacksToRemove.forEach(a => {
      this.playerAttacks.remove(a.mesh);
      this.state.playerAttacks.delete(a.uuid);
    })

     pAttacksToRemove.forEach(a => {
       this.playerAttacks.remove(a.mesh);
       this.state.playerAttacks.delete(a.uuid);
     })

     eAttacksToRemove.forEach(a => {
      this.enemyAttacks.remove(a.mesh);
      this.state.enemyAttacks.delete(a.uuid);
    })

    this.state.enemies.forEach(value =>  {
      const attacks: Attack[] = value.attack(0);
      attacks.forEach(a => {
        this.enemyAttacks.add(a.mesh);
        this.state.enemyAttacks.set(a.uuid, a);
      })
    })

    this.state.players.forEach(player =>  {
      if(player.shooting) {
        const attacks: Attack[] = player.attack(0);
        attacks.forEach(a => {
          this.playerAttacks.add(a.mesh);
          this.state.playerAttacks.set(a.uuid, a);
        });
      } 
    })

    this.controls.buttonsPressed.forEach(i => {
      const attacks: Attack[] = this.player.attack(i);
      attacks.forEach(a => {
        this.playerAttacks.add(a.mesh);
        // this.state.playerAttacks.set(a.uuid, a);
        this.state.localPlayerAttacks.set(a.uuid, a); 
      })
    });
    this.state.enemies.forEach(value => value.animate(0))
    this.keysPressed.forEach((value) => value());
    this.player.mesh.lookAt(this.intersectPoint); // face our arrow to this point
    this.collisionDetection();
    
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize(): void {
    const windowHalfX = window.innerWidth / 2;
		const windowHalfY = window.innerHeight / 2;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.viewportSize = this.getViewPortWidth();
  }

  intersectPoint = new THREE.Vector3();//for reuse

  // @Debounce(10)
  onMouseMove(e: MouseEvent): void {
    this.controls.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.controls.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.controls.mouse, this.camera);//set raycaster
    this.raycaster.ray.intersectPlane(this.plane, this.intersectPoint); // find the point of intersection
  
    this.marker.position.copy(this.intersectPoint);
  }

  private collisionDetection() {
    var playerBB = new THREE.Box3().setFromObject(this.player.mesh);
    const playerAttacksToRemove: any[] = [];
    this.state.enemyAttacks.forEach(a => {
      var attackBB = new THREE.Box3().setFromObject(a.mesh);
      var isCollision = attackBB.intersectsBox(playerBB);
      if(isCollision){
        playerAttacksToRemove.push(a);
        this.player.onHit();
      }
    });

    playerAttacksToRemove.forEach(o => {
      this.enemyAttacks.remove(o.mesh);
      this.state.enemyAttacks.delete(o.uuid);
    }); 

    this.state.enemies.forEach(e => {
      var enemyBB = new THREE.Box3().setFromObject(e.mesh);
      this.state.localPlayerAttacks.forEach(a => {
        var attackBB = new THREE.Box3().setFromObject(a.mesh);
        var isCollision = attackBB.intersectsBox(enemyBB);
        if(isCollision){
            //console.log('Hit Enemy!');
            this.state.hitEnemies.set(e.uuid, e);
            return;
        }
      });
    });
  }


  onPointerDown(e: MouseEvent) {
    let btn: MouseButton;
    this.controls.buttonsPressed.add(e.button);
    this.player.shooting = this.controls.buttonsPressed.size > 0;
  }

  onPointerUp(e: MouseEvent) {
    this.controls.buttonsPressed.delete(e.button);
    this.player.shooting = this.controls.buttonsPressed.size > 0;
  }
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    let position: Position, subtract: boolean;
    switch(e.key) {
      case 'w':
        position = Position.Y;
        subtract = true;
        break;
      case 'a':
        position = Position.X;
        subtract = false;
        break;
      case 's':
        position = Position.Y;
        subtract = false;
        break;
      case 'd':
        position = Position.X;
        subtract = true;
        break;
    }
    this.keysPressed.set(e.key, () => this.player.updatePosition(position, subtract));
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    switch(e.key) {
      case 'w':
      case 'a':
      case 's':
      case 'd':
        this.keysPressed.delete(e.key);
        break;
    }
  }

  ngOnDestroy(): void {
    this.ngDestroy.next(false);
    this._game.leaveRoom();
    if(!!this.gui) {
      this.gui.removeFolder(this.bloomFolder);
      this.gui.removeFolder(this.enemyFolder);  
    }
  }

}
