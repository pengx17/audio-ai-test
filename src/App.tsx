import { useState } from "react";
import { SpeechRecorder } from "./recorder";

function App() {
  const [recorder, setRecorder] = useState<SpeechRecorder | null>(null);
  const [result, setResult] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const handleResult = (result: string) => {
    setResult((prev) => prev + result);
  };

  const handleAudioLevel = (level: number) => {
    const normalizedLevel = Math.max(0, (level + 60) / 60);
    setAudioLevel(normalizedLevel);
  };

  return (
    <>
      <button
        onClick={async () => {
          console.log("开始录音");
          const recorder = new SpeechRecorder({
            onResult: handleResult,
            onAudioLevel: handleAudioLevel,
          });
          await recorder.init();
          recorder.startRecording();
          setRecorder(recorder);
        }}
        disabled={recorder !== null}
      >
        开始录音 {recorder ? "🟢" : "🔴"}
      </button>
      <button
        onClick={() => {
          recorder?.dispose();
          setRecorder(null);
        }}
      >
        停止录音
      </button>
      {recorder && <progress value={audioLevel} max={1} />}

      <pre>
        <code>{result}</code>
      </pre>
    </>
  );
}

export default App;
