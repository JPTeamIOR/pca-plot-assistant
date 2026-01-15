import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotData, Layout } from 'plotly.js';

@Component({
    selector: 'app-plot-container',
    standalone: true,
    imports: [CommonModule, PlotlyComponent],
    template: `
    <div class="plot-wrapper" *ngIf="data && data.length > 0">
      <plotly-plot 
        [data]="data" 
        [layout]="layout" 
        [useResizeHandler]="true" 
        [style]="{position: 'relative', width: '100%', height: '100%'}">
      </plotly-plot>
    </div>
    <div class="no-data" *ngIf="!data || data.length === 0">
      <p>Awaiting data to generate visualization...</p>
    </div>
  `,
    styles: [`
    .plot-wrapper {
      width: 100%;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
      border: 1px solid #e0e0e0;
    }
    .no-data {
      text-align: center;
      color: #757575;
      padding: 40px;
      font-style: italic;
    }
  `]
})
export class PlotContainerComponent {
    @Input() data: any[] = [];
    @Input() layout: any = {};

    constructor() {
        // Ensuring Plotly is registered for the first instance
        PlotlyService.setPlotly(PlotlyJS);
    }
}
