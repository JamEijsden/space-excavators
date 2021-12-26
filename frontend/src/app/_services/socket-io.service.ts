import { ChatMessage } from './../shared/chat-message';
import { User } from './../shared/class/user';
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, BehaviorSubject } from 'rxjs';
import { Room } from '../shared/class/room';
import { environment } from 'src/environments/environment';
import { EntityState } from '../shared/class/entity-state';

@Injectable({
  providedIn: 'root'
})
export class SocketIoService {
  private url = environment.serverUrl + ':' + environment.serverPort + '/';
  private systemUser: User = new User('System', 'lightgreen');

  private socket!: Socket;
  private registered = false;
  private _chatMessages: Subject<ChatMessage>  = new Subject();
  private _rooms: BehaviorSubject<Room[]> = new BehaviorSubject([] as Room[]);
  private _chatHistory: BehaviorSubject<ChatMessage[]>  = new BehaviorSubject([] as ChatMessage[]);
  private _playerUpdate: Subject<any>  = new Subject();
  private _gameState: Subject<any>  = new Subject();
  private _serverTime: Subject<{server: number, client: number}> = new Subject();
  constructor() {}

  public get chatMessages() {
    return this._chatMessages;
  }

  public get chatHistory() {
    return this._chatHistory;
  }

  public get rooms() {
    return this._rooms;
  }

  public get playerUpdate() {
    return this._playerUpdate;
  }

  public get serverTime() {
    return this._serverTime;
  }

  public get gameState() {
    return this._gameState;
  }

  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url);
      this.socket.on("connect", () => {
        
        this.socket.on("connect_error", (e) => {
          console.error("Connect error", e); // undefined
          reject(false);
        });

        this.socket.on("connect_timeout", (e) => {
          console.error("Connect timeout", e); // undefined
          reject(false);
        });

        this.socket.on("disconnect", () => {
          console.log("Disconnected!"); // undefined
        });

        this.socket.on("time/server", (times: {server: number, client: number}) => {
          this._serverTime.next(times);
          console.log(times);
        });
    
        this.socket.on("rooms", (rooms) => {
          this.rooms.next(rooms);
        });

        console.log("Connected!"); // x8WIv7-mJelg7on_ALbx
        resolve(true);
      });
    });
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  hostGame(user: User): Subject<boolean> {
    const resp: Subject<boolean> = new Subject();
    this.socket.emit('host', {name: 'Room ' + user.username, user: user}, (success: boolean) => {
      this.onGameInit(success);
      resp.next(success);
    });
    return resp;
  }

  joinGame(room: Room, user: User): Subject<boolean> {
    const resp: Subject<boolean> = new Subject();
    this.socket.emit('join', {id: room.host.uuid, user: user}, (success: boolean) => {
      this.onGameInit(success);
      resp.next(success);
    });
    return resp;
  }

  onGamePlayerUpdate(update: any) {
    const str: string = update.join ? 'joined' : 'left';
    this.chatMessages.next(new ChatMessage(this.systemUser, `${update.user.username} has ${str}!`, new Date().getTime()));
    this.playerUpdate.next(update);
  }

  onGameInit(success: boolean) {
    if(success) {
      this.socket.on('game/player/update', (update) => this.onGamePlayerUpdate(update));
      this.socket.on('game/update', (update) => {
        this._gameState.next(update);
      });    
    }
  }

  leaveGame() {
    if(!this.socket) {
      return;
    }
    this.socket.off('game/update');
    this.socket.off('game/player/update');
    this.socket.emit("leave", {});
  }

  joinChat() {
    this.socket.on('chat', (msg: ChatMessage) => {
      this.chatMessages.next(msg);
      console.log(msg);
    });
  }

  updateUser(user: User) {
    this.socket.emit('user/update', user);
  }

  sendChatMessage(user: User, msg: string): ChatMessage {
    const chatMsg: ChatMessage = new ChatMessage(user, msg, new Date().getTime()); 
    this.socket.emit('chat', chatMsg);
    return chatMsg;
  }

  sendPlayerData(playerState: any) {
    this.socket.emit('player/update', playerState);
  }

  fetchServerTime(clientTime: number): Promise<{server: number, client: number}> {
    return new Promise((resolve, reject) => {
      console.log(clientTime);;
      this.socket.emit('time/server', clientTime, (times: any) => resolve(times));
    });
  }

  determineLatency(clientTimeMs: number) {
    return new Promise<number>((resolve, reject) => {
      this.socket.emit('time/latency', clientTimeMs, (data: any) => {
        resolve(data);
      });  
    })
  }
}
