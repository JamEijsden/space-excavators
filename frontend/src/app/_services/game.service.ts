import { User } from './../shared/class/user';
import { ChatMessage } from './../shared/chat-message';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SocketIoService } from './socket-io.service';
import { Injectable } from '@angular/core';
import { Room } from '../shared/class/room';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { PlayerState } from '../shared/class/player-state';

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


  constructor(private _ws: SocketIoService, private _router: Router) {
    this.init();
    const localUser: string | null = localStorage.getItem('user');
    if(!!localUser) {
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
        if(update.join) {
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
      if(!!data) {
        data.users.forEach((u: User) => {
          this.players.set(u.uuid, u);
        });
        this._ws.joinChat();
        this._router.navigate(['game']);
      }        
    });
  }

  sendPlayerUpdate(playerState: PlayerState) {
    this._ws.sendPlayerData(playerState)
  }

  leaveRoom() {
    this._ws.leaveGame();
  }

  public get gameState() {
    return this._ws.gameState;
  }

}
