import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostItem } from '../services/post.service';

@Component({
  selector: 'app-edititem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edititem.component.html',
  styleUrls: ['./edititem.component.scss']
})
export class EditItemComponent implements OnInit {

  @Input() item!: PostItem;

  @Output() saveItem = new EventEmitter<PostItem>();
  @Output() close = new EventEmitter<void>();

  editableItem!: PostItem;

  ngOnInit() {
    this.editableItem = { ...this.item };
  }

  saveFromClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    queueMicrotask(() => this.save());
  }

  save(){
    this.saveItem.emit(this.editableItem);
  }

  cancel(){
    this.close.emit();
  }
}