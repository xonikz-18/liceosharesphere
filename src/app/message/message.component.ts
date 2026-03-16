import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent {

  /* toggle between inbox and chat */

  openChat = false;

  messageText = '';

  messages = [
    { from: 'kissie', text: 'Hi!', time: '1h' },
    { from: 'me', text: 'Hello!', time: '1h' },
    { from: 'kissie', text: 'Thank you!', time: '1h' }
  ];

  openConversation(){
    this.openChat = true;
  }

  goBack(){
    this.openChat = false;
  }

  sendMessage(){

    if(this.messageText.trim() === '') return;

    this.messages.push({
      from: 'me',
      text: this.messageText,
      time: 'now'
    });

    this.messageText = '';
  }

}