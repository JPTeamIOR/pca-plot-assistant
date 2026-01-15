import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ChatInputComponent } from './chat-input/chat-input.component';
import { PlotContainerComponent } from './plot-container/plot-container.component';
import { AiService } from './services/ai.service';
import { PlotData, Layout } from 'plotly.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule,
    MatProgressBarModule,
    ChatInputComponent,
    PlotContainerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('PCA Plot Assistant');

  userIntent = signal<string | null>(null);
  isLoading = signal(false);
  plotResult = signal<{ data: any[], layout: any } | null>(null);

  constructor(private aiService: AiService) { }

  handleMessage(text: string) {
    this.userIntent.set(text);
    this.isLoading.set(true);
    this.plotResult.set(null); // Reset plot while loading

    this.aiService.sendQuery(text).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        console.log('Backend Response for intent:', response);

        if (response.plot && !response.plot.error) {
          this.plotResult.set({
            data: response.plot.data,
            layout: response.plot.layout
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('AI Service Error:', err);
      }
    });
  }
}
