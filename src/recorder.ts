import { audioBufferToWav } from "./audio-buffer-to-wav";

const debug = (message: string, ...args: unknown[]) => {
  console.debug(`[SpeechRecorder] ${message}`, ...args);
};

interface RecorderOptions {
  provider: "whisper" | "gemini";
  /** Silence threshold in dB (default: -50) */
  silenceThreshold: number;
  /** Duration of silence before stopping in ms (default: 800) */
  silenceTimeout: number;
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Callback for ASR results */
  onResult?: (text: string) => void;
  /** Callback for error handling */
  onError?: (error: Error) => void;
  /** Callback for audio level updates */
  onAudioLevel?: (db: number) => void;
}

interface ASRResult {
  transcription: string;
}

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
} as const;

const RECORDER_DEFAULTS = {
  provider: "whisper",
  silenceThreshold: -50,
  silenceTimeout: 800,
  sampleRate: 16000,
  onResult: (text: string) => console.log("Recognition result:", text),
  onError: (error: Error) => console.error("Error:", error),
  onAudioLevel: () => {},
} as const;

const FFT_SIZE = 2048;
const CHUNK_INTERVAL = 1000;
const AUDIO_MIME_TYPE = "audio/webm;codecs=opus";
const ASR_ENDPOINT = "http://localhost:6544/transcribe";
const MAX_RECORDING_LENGTH = 15000; // 15 seconds in milliseconds

export class SpeechRecorder {
  private readonly options: RecorderOptions;
  private readonly audioState: {
    mediaRecorder: MediaRecorder | null;
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    stream: MediaStream | null;
  };
  private readonly recordingState: {
    isRecording: boolean;
    isWaitingForSpeech: boolean;
    silenceStartTime: number | null;
    recordingStartTime: number | null;
    chunks: Blob[];
  };

  private audioLevelMonitor: AudioLevelMonitor | null = null;

  constructor(options: Partial<RecorderOptions> = {}) {
    this.options = { ...RECORDER_DEFAULTS, ...options };
    this.audioState = {
      mediaRecorder: null,
      audioContext: null,
      analyser: null,
      stream: null,
    };
    this.recordingState = {
      isRecording: false,
      isWaitingForSpeech: false,
      silenceStartTime: null,
      recordingStartTime: null,
      chunks: [],
    };
  }

  public async init(): Promise<boolean> {
    try {
      debug("Initializing...");
      await this.initializeAudioStream();
      await this.setupAudioContext();
      this.setupMediaRecorder();
      debug("Initialization complete");
      return true;
    } catch (err) {
      debug("Initialization failed:", err);
      this.handleError(err as Error);
      return false;
    }
  }

  public setProvider(provider: "whisper" | "gemini"): void {
    this.options.provider = provider;
  }

  private async initializeAudioStream(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...AUDIO_CONSTRAINTS,
        sampleRate: this.options.sampleRate,
      },
    });
    debug("Got media stream");
    this.audioState.stream = stream;
  }

  private async setupAudioContext(): Promise<void> {
    if (!this.audioState.stream) throw new Error("No media stream available");

    this.audioState.audioContext = new AudioContext({
      sampleRate: this.options.sampleRate,
    });
    debug("Created AudioContext with sample rate:", this.options.sampleRate);

    const source = this.audioState.audioContext.createMediaStreamSource(
      this.audioState.stream
    );
    this.audioState.analyser = this.audioState.audioContext.createAnalyser();
    this.audioState.analyser.fftSize = FFT_SIZE;
    source.connect(this.audioState.analyser);
  }

  private setupMediaRecorder(): void {
    if (!this.audioState.stream) throw new Error("No media stream available");

    this.audioState.mediaRecorder = new MediaRecorder(this.audioState.stream, {
      mimeType: AUDIO_MIME_TYPE,
    });

    this.setupRecorderEventListeners();
  }

  private setupRecorderEventListeners(): void {
    if (!this.audioState.mediaRecorder) return;

    this.audioState.mediaRecorder.ondataavailable = this.handleDataAvailable;
    this.audioState.mediaRecorder.onstop = this.handleRecordingStop;
  }

  private handleDataAvailable = (e: BlobEvent): void => {
    if (e.data.size > 0) {
      this.recordingState.chunks.push(e.data);
      debug("Received audio chunk:", e.data.size, "bytes");
    }
  };

  private handleRecordingStop = async (): Promise<void> => {
    debug("MediaRecorder stopped, processing chunks...");
    try {
      const audioBlob = new Blob(this.recordingState.chunks, {
        type: AUDIO_MIME_TYPE,
      });
      debug("Created audio blob:", audioBlob.size, "bytes");
      this.recordingState.chunks = [];
      await this.processAudioSegment(audioBlob);
    } catch (err) {
      this.handleError(err as Error);
    }
  };

  public startRecording(): void {
    const { mediaRecorder } = this.audioState;
    const { isRecording } = this.recordingState;

    if (!mediaRecorder || isRecording) return;

    try {
      debug("Starting recording...");
      mediaRecorder.start(CHUNK_INTERVAL);
      this.recordingState.isRecording = true;
      this.recordingState.recordingStartTime = Date.now();
      this.startAudioLevelMonitoring();
      debug("Recording started");
    } catch (err) {
      debug("Failed to start recording:", err);
      this.handleError(err as Error);
    }
  }

  public async stopRecording(waitForSpeech = false): Promise<void> {
    const { mediaRecorder } = this.audioState;
    const { isRecording } = this.recordingState;

    if (!mediaRecorder || !isRecording) {
      debug("Stop recording called but recorder is not active");
      return;
    }

    try {
      debug("Stopping current recording segment...");

      // Create a promise that resolves when the mediaRecorder.onstop event fires
      const stopPromise = new Promise<void>((resolve) => {
        const originalOnStop = mediaRecorder.onstop;
        mediaRecorder.onstop = async (event) => {
          if (originalOnStop) {
            await (originalOnStop as (event: Event) => Promise<void>)(event);
          }
          resolve();
        };
      });

      mediaRecorder.stop();
      this.recordingState.isRecording = false;
      this.recordingState.isWaitingForSpeech = waitForSpeech;
      debug(
        waitForSpeech ? "Waiting for next speech segment" : "Recording stopped"
      );

      // Wait for the stop event to complete
      await stopPromise;
    } catch (err) {
      debug("Failed to stop recording:", err);
      this.handleError(err as Error);
    }
  }

  private startAudioLevelMonitoring(): void {
    if (!this.audioState.analyser) {
      debug("Cannot start audio monitoring - no analyser");
      return;
    }

    if (this.audioLevelMonitor) {
      this.audioLevelMonitor.stop();
      this.audioLevelMonitor = null;
    }

    const monitor = new AudioLevelMonitor(
      this.audioState.analyser,
      this.options.silenceThreshold,
      this.options.silenceTimeout,
      {
        onSilenceStart: () => this.handleSilenceStart(),
        onSilenceEnd: () => this.handleSilenceEnd(),
        onSilenceTimeout: () => this.handleSilenceTimeout(),
        onSpeechDetected: () => this.handleSpeechDetected(),
        onAudioLevel: (db: number) => {
          if (this.options.onAudioLevel) {
            this.options.onAudioLevel(db);
          }
        },
        onCheckDuration: () => this.checkRecordingDuration(),
      }
    );

    monitor.start();
    this.audioLevelMonitor = monitor;
  }

  private async convertToWav(audioBlob: Blob): Promise<ArrayBuffer> {
    if (!this.audioState.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioState.audioContext.decodeAudioData(
      arrayBuffer
    );

    return audioBufferToWav(audioBuffer);
  }

  private async sendToASR(wavBuffer: ArrayBuffer): Promise<void> {
    try {
      debug("Sending audio to ASR service...");
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      debug("WAV blob size:", wavBlob.size, "bytes");

      const providerType = this.options.provider;
      const url = ASR_ENDPOINT + "?provider=" + providerType;
      const response = await fetch(url, {
        method: "POST",
        body: wavBlob,
        headers: {
          "Content-Type": "audio/wav",
        },
      });

      if (!response.ok) {
        debug("ASR request failed:", response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ASRResult = await response.json();
      debug("Received ASR result:", result);
      if (this.options.onResult) {
        this.options.onResult(result.transcription);
      }
    } catch (err) {
      debug("ASR error:", err);
      this.handleError(err as Error);
    }
  }

  private handleError(error: Error): void {
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  public async dispose(): Promise<void> {
    debug("Disposing recorder...");

    if (
      this.recordingState.isRecording ||
      this.recordingState.isWaitingForSpeech
    ) {
      debug("Stopping active recording before disposal");
      await this.stopRecording(false);
    }

    if (this.audioState.analyser) {
      this.audioState.analyser.disconnect();
      this.audioState.analyser = null;
    }

    if (this.audioState.stream) {
      debug("Stopping media stream tracks");
      this.audioState.stream.getTracks().forEach((track) => {
        debug(
          `Stopping track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`
        );
        track.stop();
      });
    }

    if (this.audioState.audioContext) {
      debug("Closing audio context");
      await this.audioState.audioContext.close();
    }

    if (this.audioLevelMonitor) {
      this.audioLevelMonitor.stop();
      this.audioLevelMonitor = null;
    }

    this.audioState.mediaRecorder = null;
    this.audioState.audioContext = null;
    this.audioState.stream = null;
    debug("Recorder disposed");
  }

  private async processAudioSegment(audioBlob: Blob): Promise<void> {
    const wavBuffer = await this.convertToWav(audioBlob);
    debug("Converted segment to WAV format:", wavBuffer.byteLength, "bytes");
    await this.sendToASR(wavBuffer);
  }

  private handleSilenceStart(): void {
    debug("Silence period started");
    this.recordingState.silenceStartTime = Date.now();
  }

  private handleSilenceEnd(): void {
    debug("Silence period ended");
    this.recordingState.silenceStartTime = null;
  }

  private handleSilenceTimeout(): void {
    if (this.recordingState.isRecording) {
      debug("Silence timeout reached, stopping current segment");
      this.stopRecording(true);
    }
  }

  private handleSpeechDetected(): void {
    if (this.recordingState.isWaitingForSpeech) {
      debug("Speech detected, starting new recording segment");
      this.recordingState.isWaitingForSpeech = false;
      this.startRecording();
    }
  }

  private checkRecordingDuration = (): void => {
    const { recordingStartTime, isRecording } = this.recordingState;

    if (!recordingStartTime || !isRecording) return;

    const duration = Date.now() - recordingStartTime;
    if (duration >= MAX_RECORDING_LENGTH) {
      debug(
        `Max recording length (${MAX_RECORDING_LENGTH}ms) reached, stopping current segment`
      );
      this.stopRecording(true);
    }
  };
}

class AudioLevelMonitor {
  private animationFrameId: number | null = null;
  private silenceStartTime: number | null = null;
  private readonly dataArray: Float32Array;

  private stopped = false;

  constructor(
    private readonly analyser: AnalyserNode,
    private readonly silenceThreshold: number,
    private readonly silenceTimeout: number,
    private readonly callbacks: {
      onSilenceStart: () => void;
      onSilenceEnd: () => void;
      onSilenceTimeout: () => void;
      onSpeechDetected: () => void;
      onAudioLevel: (db: number) => void;
      onCheckDuration: () => void;
    }
  ) {
    this.dataArray = new Float32Array(analyser.frequencyBinCount);
  }

  public start(): void {
    debug("Starting audio level monitoring");
    this.monitorAudioLevels();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopped = true;
    this.silenceStartTime = null;
    debug("Audio level monitoring stopped");
  }

  private monitorAudioLevels = (): void => {
    if (this.stopped) return;

    this.analyser.getFloatTimeDomainData(this.dataArray);
    const db = this.calculateDecibels();

    this.callbacks.onAudioLevel(db);
    this.callbacks.onCheckDuration();

    if (Math.random() < 0.017) {
      debug("Current audio level:", Math.round(db), "dB");
    }

    this.handleAudioLevel(db);
    this.animationFrameId = requestAnimationFrame(this.monitorAudioLevels);
  };

  private calculateDecibels(): number {
    let sum = 0;
    for (const amplitude of this.dataArray) {
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return 20 * Math.log10(Math.max(rms, Number.EPSILON));
  }

  private handleAudioLevel(db: number): void {
    const isSilent = db < this.silenceThreshold;

    if (isSilent) {
      this.handleSilence();
    } else {
      this.handleSpeech(db);
    }
  }

  private handleSilence(): void {
    const now = Date.now();

    if (this.silenceStartTime === null) {
      this.silenceStartTime = now;
      this.callbacks.onSilenceStart();
      debug("Silence started");
    } else {
      const silenceDuration = now - this.silenceStartTime;

      if (silenceDuration >= this.silenceTimeout) {
        debug(`Silence timeout reached after ${silenceDuration}ms`);
        this.callbacks.onSilenceTimeout();
        this.silenceStartTime = null;
      } else if (silenceDuration >= this.silenceTimeout / 2) {
        debug(
          `Silence continues: ${silenceDuration}ms / ${this.silenceTimeout}ms`
        );
      }
    }
  }

  private handleSpeech(db: number): void {
    if (this.silenceStartTime !== null) {
      debug("Speech detected after silence, level:", Math.round(db), "dB");
      this.silenceStartTime = null;
      this.callbacks.onSilenceEnd();
      this.callbacks.onSpeechDetected();
    }
  }
}
