import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './chat.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';



@NgModule({
  declarations: [
    ChatComponent
  ],
  imports: [
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    FormsModule,
    CommonModule
  ],
  exports: [ChatComponent]
})
export class ChatModule { }
