import { GameService } from './_services/game.service';
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  constructor(private _game: GameService) {

  }

  isChatActive() {
    return this._game.openState;
  }

  @HostListener('window:keyup.enter', ['$event'])
  onEnterUp(e: KeyboardEvent): void {
    console.log(this._game.openState);
    if(!this._game.closeOnNext && !this._game.openState) {
      this._game.toggle();
    }
    this._game.closeOnNext = false;
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:keyup.esc', ['$event'])
  onEscUp(e: KeyboardEvent): void {
    if(this._game.openState) {
      this._game.toggle();
    }
  }

}
