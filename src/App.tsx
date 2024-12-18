import { useState, useRef, useEffect } from "react";
import { SpeechRecorder } from "./recorder";

function App() {
  const [recorder, setRecorder] = useState<SpeechRecorder | null>(null);
  const [result, setResult] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const preRef = useRef<HTMLPreElement>(null);

  const handleResult = (result: string) => {
    setResult((prev) => prev + result);
  };

  const handleAudioLevel = (level: number) => {
    const normalizedLevel = Math.max(0, (level + 60) / 60);
    setAudioLevel(normalizedLevel);
  };

  useEffect(() => {
    if (preRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = preRef.current;
      const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 1;

      if (isScrolledToBottom) {
        preRef.current.scrollTop = scrollHeight;
      }
    }
  }, [result]);

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
      {recorder && (
        <div>
          🎙️
          <progress value={audioLevel} max={1} />
        </div>
      )}

      <pre
        ref={preRef}
        style={{
          maxHeight: "500px",
          overflow: "auto",
          border: "1px solid #ccc",
          padding: "10px",
          margin: "10px 0",
        }}
      >
        <code>{result}</code>
      </pre>
    </>
  );
}

export default App;
