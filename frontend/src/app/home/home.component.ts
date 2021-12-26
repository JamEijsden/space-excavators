import { GameService } from '../_services/game.service';
import { ChatMessage } from './../shared/chat-message';
import { SocketIoService } from './../_services/socket-io.service';
import { User } from './../shared/class/user';
import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs';
import { Room } from '../shared/class/room';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  displayedColumns: string[] = ['name', 'host', 'playerNumber'];
  selectedRoom: Room | null = null;

  user: User;
  rooms!: BehaviorSubject<Room[]>; 
  message: string = '';
  connected = false;
  chatMessage: ChatMessage[] = []; 
  constructor(private _ws: SocketIoService, private _game: GameService, private _router: Router) {
    this.user = _game.user;
   }

  ngOnInit(): void {
    this.rooms = this._ws.rooms;
    this._ws.connect()
    .then((success: boolean) => {
      if(success) {
        console.log("Connected to server");
      } else {
        console.log("Failed to connect to server");
      }
    });
  }

  isConnected() {
    return this._ws.isConnected();
  }

  updateUser(username: string = this.user.username, color: string = this.user.color, e?: Event) {
    localStorage.setItem('user', JSON.stringify(this.user));
    this._game.updateUser(username, color);
    e?.preventDefault();
  }

  hostGame() {
    this._ws.hostGame(this.user)
    .pipe(take(1))
    .subscribe(r => {
      console.log('host success', r);
      this._ws.joinChat();
      this._router.navigate(['game']);
    });
  }

  joinGame() {
    console.log(this.selectedRoom);
    this._game.joinGame(this.selectedRoom as Room, this.user);
  }

  canDeactivate(): Observable<boolean> | boolean {
    return true;
  }

}
