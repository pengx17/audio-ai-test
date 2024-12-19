import { SpeechRecorder } from "./recorder";
import { audioBufferToWav } from "./audio-buffer-to-wav";

const ASR_ENDPOINT = "http://localhost:6544/transcribe";

export class ASRHelper {
  private readonly audioContext: AudioContext;

  constructor(
    public provider: "whisper" | "gemini",
    private readonly recorder: SpeechRecorder,
    private readonly onResult: (text: string) => void,
    private readonly onError: (error: Error) => void
  ) {
    this.audioContext = new AudioContext();
    this.setupEventListeners();
  }

  public setProvider(provider: "whisper" | "gemini") {
    this.provider = provider;
  }

  get asrEndpoint(): string {
    return ASR_ENDPOINT + "?provider=" + this.provider;
  }

  private setupEventListeners(): void {
    this.recorder.addEventListener("silenceDetected", this.handleSilence);
    this.recorder.addEventListener("error", this.onError);
  }

  private handleSilence = async (audioBlob: Blob): Promise<void> => {
    try {
      const wavBuffer = await this.convertToWav(audioBlob);
      await this.sendToASR(wavBuffer);
    } catch (err) {
      this.onError(err as Error);
    }
  };

  private async convertToWav(audioBlob: Blob): Promise<ArrayBuffer> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return audioBufferToWav(audioBuffer);
  }

  private async sendToASR(wavBuffer: ArrayBuffer): Promise<void> {
    try {
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", wavBlob, "recording.wav");

      const response = await fetch(this.asrEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.onResult(result.transcription);
    } catch (err) {
      this.onError(err as Error);
    }
  }

  public async start() {
    await this.recorder.init();
    this.recorder.startRecording();
  }

  public async stop() {
    this.recorder.removeEventListener("silenceDetected", this.handleSilence);
    this.recorder.removeEventListener("error", this.onError);
    const audioBlob = this.recorder.getFullRecording();
    await this.recorder.stopRecording();
    await this.recorder.dispose();
    return audioBlob;
  }
}

export type ASRProps = {
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
  onAudioLevel?: (db: number) => void;
  provider: "whisper" | "gemini";
};

export const createASRHelper = (props: ASRProps) => {
  const recorder = new SpeechRecorder({
    onAudioLevel: props.onAudioLevel,
  });
  return new ASRHelper(
    props.provider,
    recorder,
    props.onResult ?? (() => {}),
    props.onError ?? (() => {})
  );
};
