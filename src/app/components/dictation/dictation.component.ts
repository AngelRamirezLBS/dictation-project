import { Component, signal, computed, effect, viewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceRecognitionService } from '../../services/voice-recognition.service';

@Component({
  selector: 'app-dictation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dictation.component.html',
  styleUrls: ['./dictation.component.css']
})
export class DictationComponent {
  // Inyección de dependencias usando inject()
  public readonly voiceService = inject(VoiceRecognitionService);

  // ViewChild usando la nueva API de signals
  private readonly textareaElement = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  // Signals locales del componente
  public readonly message = signal<string>('');
  private readonly manualClear = signal<boolean>(false);

  // Computed signals para lógica derivada
  public readonly hasMessage = computed(() => this.message().length > 0);
  public readonly characterCount = computed(() => this.message().length);

  // Signals del servicio (ya son readonly)
  public readonly isRecording = this.voiceService.isRecording;
  public readonly errorMessage = this.voiceService.error;

  constructor() {
    // Effect para actualizar el mensaje con la transcripción en tiempo real
    effect(() => {
      const isRecording = this.voiceService.isRecording();
      const interim = this.voiceService.interimTranscription();
      const isManualClear = this.manualClear();

      if (isRecording && interim && !isManualClear) {
        this.message.set(interim);
        this.autoResize();
      }
    });

    // Effect para sincronizar la transcripción final
    effect(() => {
      const transcription = this.voiceService.transcription();
      const isManualClear = this.manualClear();

      if (transcription && !isManualClear) {
        this.message.set(transcription);
        this.autoResize();
      }
    });
  }

  /**
   * Toggle entre iniciar y detener grabación
   */
  toggleRecording(): void {
    if (this.isRecording()) {
      this.voiceService.stopRecording();
    } else {
      this.voiceService.startRecording();
    }
  }

  /**
   * Limpia el mensaje y reinicia la grabación si está activa
   */
  clearMessage(): void {
    const wasRecording = this.isRecording();
    this.message.set('');

    if (wasRecording) {
      // Si está grabando, marcar como limpieza manual y reiniciar
      this.manualClear.set(true);
      this.voiceService.restartRecording();

      // Resetear la bandera después de un delay
      setTimeout(() => {
        this.manualClear.set(false);
      }, 300);
    } else {
      // Si no está grabando, solo limpiar la transcripción
      this.voiceService.clearTranscription();
    }

    this.autoResize();
  }

  /**
   * Copia el texto al portapapeles
   */
  async copyToClipboard(): Promise<void> {
    const text = this.message();
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      console.log('Texto copiado al portapapeles');
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
    }
  }

  /**
   * Auto-redimensiona el textarea según el contenido
   */
  autoResize(): void {
    setTimeout(() => {
      const textarea = this.textareaElement();
      if (textarea && textarea.nativeElement) {
        const element = textarea.nativeElement;
        element.style.height = 'auto';
        const scrollHeight = element.scrollHeight;
        const maxHeight = 400; // Altura máxima en píxeles

        element.style.height = `${Math.min(scrollHeight, maxHeight)}px`;

        if (scrollHeight > maxHeight) {
          element.style.overflowY = 'auto';
        } else {
          element.style.overflowY = 'hidden';
        }
      }
    }, 0);
  }

  /**
   * Maneja cambios en el textarea
   */
  onTextareaInput(): void {
    this.autoResize();
  }
}
