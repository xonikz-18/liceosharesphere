import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-return',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return.component.html',
  styleUrls: ['./return.component.scss']
})
export class ReturnComponent {

  @Input() item: any;
  @Output() close = new EventEmitter<void>();

  returnItem(){
    console.log('Returned item:', this.item);
    this.close.emit();
  }

  cancel(){
    this.close.emit();
  }
}