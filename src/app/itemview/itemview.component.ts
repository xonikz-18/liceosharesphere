import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-itemview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itemview.component.html',
  styleUrls: ['./itemview.component.scss']
})
export class ItemViewComponent {

  @Input() item: any;
  @Output() close = new EventEmitter<void>();

  showFullImage = false;
  showPreview: boolean = false;

    openPreview(){
      this.showPreview = true;
    }
    
    closePreview(){
      this.showPreview = false;
    }
    
      constructor(private router: Router) {}
    
      onClose() {
        this.close.emit();
      }

  messageOwner() {
    this.close.emit();
    this.router.navigate(['/message'], {
    state: { user: this.item?.owner }
    });
  }

  openFullImage(event: Event){
    event.stopPropagation();
    this.showFullImage = true;
  }

  closeFullImage(){
    this.showFullImage = false;
  }
}