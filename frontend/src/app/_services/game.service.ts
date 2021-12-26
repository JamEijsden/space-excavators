import { User } from './../shared/class/user';
import { ChatMessage } from './../shared/chat-message';
import { BehaviorSubject, interval, Observable, range, Subject } from 'rxjs';
import { SocketIoService } from './socket-io.service';
import { Injectable } from '@angular/core';
import { Room } from '../shared/class/room';
import { Router } from '@angular/router';
import { take, takeUntil } from 'rxjs/operators';
import { EntityState } from '../shared/class/entity-state';
import { Enemy } from '../shared/class/enemy';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private ngDestroyGame: Subject<boolean> = new Subject();
  private _user: User = new User();
  private _players: Map<string, User> = new Map();
  private _host = false;
  openState = false;
  closeOnNext = false;
  private _guiSubject: Subject<boolean> = new Subject();
  private _chatHistory: ChatMessage[] = [];
  private _chatSubject: Subject<ChatMessage> = new Subject();
  private _userSubject: BehaviorSubject<User> = new BehaviorSubject(this.user);
  private _playerSubject: Subject<User> = new Subject();
  private _enemySubject: Subject<Enemy> = new Subject();


  constructor(private _ws: SocketIoService, private _router: Router) {
    this.init();
    const localUser: string | null = localStorage.getItem('user');
    if (!!localUser) {
      const parsedUser = JSON.parse(localUser);
      this._user.username = parsedUser.username;
      this._user.color = parsedUser.color;
    }
  }

  init() {
    this._ws.chatMessages
      .pipe()
      .subscribe((msg: ChatMessage) => {
        this.chatHistory.push(msg);
      });
    this._ws.playerUpdate
      .subscribe(update => {
        if (update.join) {
          this._players.set(update.user.uuid, update.user);
        } else {
          this._players.delete(update.user.uuid);
        }
        this._playerSubject.next(update);
      });
      
  }

  public get user(): User {
    return this._user;
  }

  public get host(): boolean {
    return this._host;
  }

  public get players(): Map<string, User> {
    return this._players;
  }

  public get playerSubject(): Subject<User> {
    return this._playerSubject;
  }

  
  public get enemySubject(): Subject<User> {
    return this._enemySubject;
  }

  public get guiSubject(): Subject<boolean> {
    return this._guiSubject;
  }

  public get chatSubject(): Subject<ChatMessage> {
    return this._chatSubject;
  }

  public get userSubject(): BehaviorSubject<User> {
    return this._userSubject;
  }

  public get chatHistory(): ChatMessage[] {
    return this._chatHistory;
  }

  sendMessage(msg: string) {
    this.chatHistory.push(this._ws.sendChatMessage(this._user, msg));
  }

  toggle() {
    this.openState = !this.openState;
    this._guiSubject.next(this.openState);
  }

  isConnected() {
    return this._ws.isConnected();
  }

  updateUser(username: string, color: string) {
    localStorage.setItem('user', JSON.stringify(this.user));
    this._user.username = username;
    this._user.color = color;
    this.userSubject.next(this.user);
    this.chatHistory.filter(m => m.user.uuid == this.user.uuid).forEach((m: ChatMessage) => m.user = this.user);
  }

  joinGame(room: Room, user: User): void {

    this._ws.joinGame(room, user)
      .pipe(take(1))
      .subscribe((data: any) => {
        if (!!data) {
          data.users.forEach((u: User) => {
            this.players.set(u.uuid, u);
          });
          this._ws.joinChat();
          this._router.navigate(['game']);
        }
      });
  }

  sendPlayerUpdate(playerState: any) {
    (playerState.hitEnemies.length == 0) || console.log(playerState);
    this._ws.sendPlayerData(playerState)
  }

  leaveRoom() {
    this._ws.leaveGame();
  }

  public get gameState() {
    return this._ws.gameState;
  }

  initiateTimeSync() {
    this._ws.fetchServerTime(Math.floor(new Date().getTime()))
    .then((times: {server: number, client: number}) => this.onFetchServerTime(times))
  }

  clientClock: number = Math.floor(new Date().getTime());
  latency: number = 0;
  latencyArray: number[] = [];
  deltaLatency: number = 0;
  decimalCollector: number= 0;
  onFetchServerTime(times: {server: number, client: number}) {
    this.latency = (Math.floor(new Date().getTime()) - times.client) / 2; // = (client os current epoch ms - old client) / 2
    this.clientClock = times.server + this.latency;

    interval(500)
    .pipe(takeUntil(this.ngDestroyGame))
    .subscribe(() => this.determineLatency());
  }

  updateLatency(delta: number) {
    const deltaMs = delta*1000;
    this.clientClock += deltaMs - this.deltaLatency;
    this.deltaLatency -= this.deltaLatency;
    this.decimalCollector += deltaMs - Math.floor(delta * 1000);
    if(this.decimalCollector >= 1.00) {
      this.clientClock += 1;
      this.decimalCollector -= 1.00;
    }
  }

  determineLatency() {
    this._ws.determineLatency(Math.floor(new Date().getTime()))
      .then((clientTimeMs: number) => this.onDetermineLatency(clientTimeMs));
  }

  onDetermineLatency(clientTimeMs: number) {
    this.latencyArray.push((Math.floor(new Date().getTime()) - clientTimeMs) / 2);
    if(this.latencyArray.length == 9) {
      let totalLatency = 0;
      this.latencyArray.sort();
      const midPoint = this.latencyArray[4];
      range(this.latencyArray.length - 1, 0)
      .forEach(i => {
          if(this.latencyArray[i] > (midPoint * 2) && this.latencyArray[i] > 20) {
            this.latencyArray.splice(i, 1);
          } else {
            totalLatency = this.latencyArray[i];
          }
      });
      
      this.deltaLatency = (totalLatency / this.latencyArray.length) - this.latency;
      this.latency = totalLatency / this.latencyArray.length;
      console.info('New Latency', this.latency, 'ms');
      console.info('Delta Latency', this.deltaLatency, 'ms');
      this.latencyArray.splice(0, this.latencyArray.length);
    }
  }

}
