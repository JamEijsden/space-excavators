import { GameService } from '../_services/game.service';
import { ChangeDetectorRef, Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ChatMessage } from '../shared/chat-message';
import { User } from '../shared/class/user';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  @ViewChild("msg") _chatInput!: ElementRef;
  get chatInput() {
    return this._chatInput;
  }

  user!: User;
  active = false;
  constructor(private _game: GameService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.user = this._game.user;
    this._game.guiSubject
      .subscribe((activate: boolean) => {
        this.active = activate;
        if(this.active) {
          setTimeout(() => this.chatInput.nativeElement.focus(), 0)
          ;
        }
      })
  }

  getChatHistory(): ChatMessage[] {
    return this._game.chatHistory;
  }

  sendMessage(msg: string, e: Event) {
    if(msg.length > 0) {
      this._game.sendMessage(msg);
    } else {
      this._game.closeOnNext = true; 
      this._game.toggle();
    }
    e.preventDefault();
  }

  onUserUpdate(user: User) {
    this.user = user;
  }

  getDate(time: number): string {
    return new Date(time).toLocaleTimeString();
  }

}
