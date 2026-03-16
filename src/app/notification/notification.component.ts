import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {

  showRequest = false;

  openRequest(){
    this.showRequest = true;
  }

  closeRequest(){
    this.showRequest = false;
  }

  approve(){
    console.log("Request approved");
    this.showRequest = false;
  }

  decline(){
    console.log("Request declined");
    this.showRequest = false;
  }

}