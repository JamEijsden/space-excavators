import { DeactivateGuard } from './_services/deactivate.service';
import { GameService } from './_services/game.service';
import { ChatModule } from './chat/chat.module';
import { SocketIoService } from './_services/socket-io.service';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ChatModule
  ],
  providers: [SocketIoService, GameService, DeactivateGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }
