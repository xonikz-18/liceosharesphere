import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-adminreview',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './adminreview.component.html',
    styleUrls: ['./adminreview.component.scss']
})
export class AdminReviewComponent {

    @Input() item: any;

    @Output() close = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();

}