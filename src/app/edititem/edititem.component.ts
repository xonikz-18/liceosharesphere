import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LentItem } from '../services/item.service';

@Component({
  selector: 'app-edititem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edititem.component.html',
  styleUrls: ['./edititem.component.scss']
})
export class EditItemComponent {

  @Input() item!: LentItem;

  // 🔥 send updated item back to parent
  @Output() close = new EventEmitter<LentItem | null>();

  save(){
    this.close.emit(this.item); // send updated data
  }

  cancel(){
    this.close.emit(null); // just close
  }
}