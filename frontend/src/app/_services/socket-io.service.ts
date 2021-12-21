import { ChatMessage } from './../shared/chat-message';
import { User } from './../shared/class/user';
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Room } from '../shared/class/room';
import { environment } from 'src/environments/environment';
import { PlayerState } from '../shared/class/player-state';

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

  public get gameState() {
    return this._gameState;
  }

  connect() {
    this.socket = io(this.url);
    this.socket.on("connect", () => {
      console.log("Connected!"); // x8WIv7-mJelg7on_ALbx
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected!"); // undefined
    });

    this.socket.on("rooms", (rooms) => {
      this.rooms.next(rooms);
    });
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  hostGame(user: User): Subject<boolean> {
    const resp: Subject<boolean> = new Subject();
    this.socket.emit('host', {name: 'Room ' + user.username, user: user}, (success: boolean) => {
      this.socket.on('game/player/update', (update) => this.onGamePlayerUpdate(update));
      this.socket.on('game/update', (update) => {
        this._gameState.next(update);
      });
      resp.next(success);
    });
    return resp;
  }

  joinGame(room: Room, user: User): Subject<boolean> {
    const resp: Subject<boolean> = new Subject();
    this.socket.emit('join', {id: room.host.uuid, user: user}, (success: boolean) => {
      this.socket.on('game/player/update', (update) => this.onGamePlayerUpdate(update));
      this.socket.on('game/update', (update) => {
        this._gameState.next(update);
      });
      resp.next(success);
    });
    return resp;
  }

  onGamePlayerUpdate(update: any) {
    const str: string = update.join ? 'joined' : 'left';
    this.chatMessages.next(new ChatMessage(this.systemUser, `${update.user.username} has ${str}!`, new Date().getTime()));
    this.playerUpdate.next(update);
  }

  leaveGame() {
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

  sendPlayerData(playerState: PlayerState) {
    this.socket.emit('player/update', playerState);
  }
}
