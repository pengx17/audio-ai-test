import { useState, useRef, useEffect } from "react";
import { SpeechRecorder } from "./recorder";

function App() {
  const [recorder, setRecorder] = useState<SpeechRecorder | null>(null);
  const [result, setResult] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [provider, setProvider] = useState<"whisper" | "gemini">("whisper");
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
      const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 100;

      if (isScrolledToBottom) {
        preRef.current.scrollTop = scrollHeight;
      }
    }
  }, [result]);

  const onProviderChange = (provider: "whisper" | "gemini") => {
    setProvider(provider);
    if (recorder) {
      recorder.setProvider(provider);
    }
  };

  return (
    <>
      <fieldset>
        <legend>Select a asr provider:</legend>

        <div>
          <input
            type="radio"
            id="whisper"
            name="asr"
            value="whisper"
            checked={provider === "whisper"}
            onChange={() => onProviderChange("whisper")}
          />
          <label htmlFor="whisper">Whisper</label>
        </div>

        <div>
          <input
            type="radio"
            id="gemini"
            name="asr"
            value="gemini"
            checked={provider === "gemini"}
            onChange={() => onProviderChange("gemini")}
          />
          <label htmlFor="gemini">Gemini</label>
        </div>
      </fieldset>

      <div>
        <button
          onClick={async () => {
            console.log("开始录音");
            const recorder = new SpeechRecorder({
              onResult: handleResult,
              onAudioLevel: handleAudioLevel,
              provider,
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
      </div>

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
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </pre>
    </>
  );
}

export default App;
