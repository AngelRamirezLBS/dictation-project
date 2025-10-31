import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DictationComponent } from './components/dictation/dictation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DictationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'dictation-project';
}
