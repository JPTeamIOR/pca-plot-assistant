import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
    selector: 'app-chat-input',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        TextFieldModule
    ],
    templateUrl: './chat-input.component.html',
    styleUrl: './chat-input.component.css'
})
export class ChatInputComponent {
    @Output() send = new EventEmitter<string>();

    message = '';

    onSend() {
        const msg = this.message.trim();
        if (msg) {
            this.send.emit(msg);
            this.message = '';
        }
    }
}
