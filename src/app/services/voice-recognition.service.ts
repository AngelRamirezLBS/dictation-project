import { Injectable, signal, computed } from '@angular/core';

// Declaración para TypeScript del Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private recognition: any;
  private finalTranscript = '';

  // Signals para estado reactivo (writable privados)
  private readonly _isRecording = signal<boolean>(false);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _transcription = signal<string>('');
  private readonly _interimTranscription = signal<string>('');
  private readonly _error = signal<string>('');

  // Signals públicos de solo lectura
  public readonly isRecording = this._isRecording.asReadonly();
  public readonly isProcessing = this._isProcessing.asReadonly();
  public readonly transcription = this._transcription.asReadonly();
  public readonly interimTranscription = this._interimTranscription.asReadonly();
  public readonly error = this._error.asReadonly();

  // Computed signal para verificar si el servicio está disponible
  public readonly isAvailable = computed(() => {
    return typeof window !== 'undefined' &&
           (window.SpeechRecognition || window.webkitSpeechRecognition) !== undefined;
  });

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Web Speech API no está soportada en este navegador');
      this._error.set('Web Speech API no está soportada en este navegador');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Modo continuo
    this.recognition.interimResults = true; // Resultados intermedios
    this.recognition.lang = 'es-ES'; // Idioma español

    // Handler para resultados
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';

      // Procesar solo desde el último índice procesado
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // Transcripción final - acumular
          this.finalTranscript += transcript + ' ';
        } else {
          // Transcripción intermedia
          interimTranscript += transcript;
        }
      }

      // Emitir la transcripción completa hasta el momento
      const fullTranscription = this.finalTranscript + interimTranscript;
      this._interimTranscription.set(fullTranscription);
    };

    // Handler para inicio
    this.recognition.onstart = () => {
      this._isRecording.set(true);
      this._isProcessing.set(false);
      this._error.set('');
    };

    // Handler para fin
    this.recognition.onend = () => {
      this._isRecording.set(false);
      this._isProcessing.set(false);

      // Emitir la transcripción final
      if (this.finalTranscript.trim()) {
        this._transcription.set(this.finalTranscript.trim());
      }
    };

    // Handler para errores
    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      this._error.set(`Error: ${event.error}`);
      this._isRecording.set(false);
      this._isProcessing.set(false);
    };
  }

  /**
   * Inicia el reconocimiento de voz
   */
  public startRecording(): void {
    if (!this.recognition) {
      this._error.set('Reconocimiento de voz no disponible');
      return;
    }

    try {
      this.finalTranscript = '';
      this._isProcessing.set(true);
      this.recognition.start();
    } catch (error) {
      console.error('Error al iniciar reconocimiento:', error);
      this._error.set('Error al iniciar reconocimiento');
      this._isProcessing.set(false);
    }
  }

  /**
   * Detiene el reconocimiento de voz
   */
  public stopRecording(): void {
    if (!this.recognition) return;

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error al detener reconocimiento:', error);
    }
  }

  /**
   * Limpia todas las transcripciones
   */
  public clearTranscription(): void {
    this.finalTranscript = '';
    this._transcription.set('');
    this._interimTranscription.set('');
  }

  /**
   * Reinicia el reconocimiento completamente
   * Usa abort() para limpiar el historial interno del Web Speech API
   */
  public restartRecording(): void {
    if (!this.recognition) return;

    try {
      // Limpiar transcripciones ANTES de abortar
      this.finalTranscript = '';
      this._transcription.set('');
      this._interimTranscription.set('');

      // Usar abort() en lugar de stop() para limpiar el historial interno
      this.recognition.abort();

      // Reiniciar después de un breve delay para asegurar que abort() termine
      setTimeout(() => {
        this.finalTranscript = ''; // Limpiar nuevamente por si acaso
        this.startRecording();
      }, 150);
    } catch (error) {
      console.error('Error al reiniciar reconocimiento:', error);
    }
  }
}
