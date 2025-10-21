import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent {
  @Input() selectedProvince: any = null;
}
