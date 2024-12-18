export const languages = [
  "af",
  "am",
  "ar",
  "as",
  "az",
  "ba",
  "be",
  "bg",
  "bn",
  "bo",
  "br",
  "bs",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fo",
  "fr",
  "gl",
  "gu",
  "ha",
  "haw",
  "he",
  "hi",
  "hr",
  "ht",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "ja",
  "jw",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "la",
  "lb",
  "ln",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "ne",
  "nl",
  "nn",
  "no",
  "oc",
  "pa",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "sa",
  "sd",
  "si",
  "sk",
  "sl",
  "sn",
  "so",
  "sq",
  "sr",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "tk",
  "tl",
  "tr",
  "tt",
  "uk",
  "ur",
  "uz",
  "vi",
  "yi",
  "yo",
  "zh",
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Azerbaijani",
  "Bashkir",
  "Basque",
  "Belarusian",
  "Bengali",
  "Bosnian",
  "Breton",
  "Bulgarian",
  "Burmese",
  "Castilian",
  "Catalan",
  "Chinese",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Faroese",
  "Finnish",
  "Flemish",
  "French",
  "Galician",
  "Georgian",
  "German",
  "Greek",
  "Gujarati",
  "Haitian",
  "Haitian Creole",
  "Hausa",
  "Hawaiian",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Icelandic",
  "Indonesian",
  "Italian",
  "Japanese",
  "Javanese",
  "Kannada",
  "Kazakh",
  "Khmer",
  "Korean",
  "Lao",
  "Latin",
  "Latvian",
  "Letzeburgesch",
  "Lingala",
  "Lithuanian",
  "Luxembourgish",
  "Macedonian",
  "Malagasy",
  "Malay",
  "Malayalam",
  "Maltese",
  "Maori",
  "Marathi",
  "Moldavian",
  "Moldovan",
  "Mongolian",
  "Myanmar",
  "Nepali",
  "Norwegian",
  "Nynorsk",
  "Occitan",
  "Panjabi",
  "Pashto",
  "Persian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Pushto",
  "Romanian",
  "Russian",
  "Sanskrit",
  "Serbian",
  "Shona",
  "Sindhi",
  "Sinhala",
  "Sinhalese",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Sundanese",
  "Swahili",
  "Swedish",
  "Tagalog",
  "Tajik",
  "Tamil",
  "Tatar",
  "Telugu",
  "Thai",
  "Tibetan",
  "Turkish",
  "Turkmen",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Valencian",
  "Vietnamese",
  "Welsh",
  "Yiddish",
  "Yoruba",
] as const;

export type Language = (typeof languages)[number];

export type WhisperModel =
  | "mlx-community/whisper-tiny.en"
  | "mlx-community/whisper-tiny"
  | "mlx-community/whisper-base.en"
  | "mlx-community/whisper-base"
  | "mlx-community/whisper-small.en"
  | "mlx-community/whisper-small"
  | "mlx-community/whisper-medium.en"
  | "mlx-community/whisper-medium"
  | "mlx-community/whisper-large"
  | "mlx-community/whisper-large-v1"
  | "mlx-community/whisper-large-v2"
  | "mlx-community/whisper-large-v3"
  | "mlx-community/whisper-turbo";

export type StringOutputFormat = "txt" | "vtt" | "srt" | "tsv";

export type OutputFormat = StringOutputFormat | "json";

export type AllOutputFormats = OutputFormat | "all";

export interface AudioToTextOptions {
  /** Name of the Whisper model to use (default: small) */
  model?: WhisperModel;
  /** The path to save model files; uses ~/.cache/whisper by default (default: None) */
  model_dir?: string;
  /** Device to use for PyTorch inference (default: cuda) */
  device?: string;
  /** Directory to save the outputs (default: .) */
  output_dir?: string;
  /** Whether to print out the progress and debug messages (default: True) */
  verbose?: boolean;
  /** Whether to perform X->X speech recognition ('transcribe') or X->English translation ('translate') (default: transcribe) */
  task?: "transcribe" | "translate";
  /** Language spoken in the audio, specify None to perform language detection (default: None) */
  language?: Language;
  /** Temperature to use for sampling (default: 0) */
  temperature?: number;
  /** Number of candidates when sampling with non-zero temperature (default: 5) */
  best_of?: number;
  /** Number of beams in beam search, only applicable when temperature is zero (default: 5) */
  beam_size?: number;
  /** Optional patience value to use in beam decoding (default: None) */
  patience?: number;
  /** Optional token length penalty coefficient (alpha) (default: None) */
  length_penalty?: number;
  /** Comma-separated list of token ids to suppress during sampling (default: -1) */
  suppress_tokens?: string;
  /** Optional text to provide as a prompt for the first window (default: None) */
  initial_prompt?: string;
  /** If True, provide the previous output of the model as a prompt for the next window (default: True) */
  condition_on_previous_text?: boolean;
  /** Whether to perform inference in fp16; True by default (default: True) */
  fp16?: boolean;
  /** Temperature to increase when falling back when the decoding fails (default: 0.2) */
  temperature_increment_on_fallback?: number;
  /** If the gzip compression ratio is higher than this value, treat the decoding as failed (default: 2.4) */
  compression_ratio_threshold?: number;
  /** If the average log probability is lower than this value, treat the decoding as failed (default: -1.0) */
  logprob_threshold?: number;
  /** If the probability of the token is higher than this value AND the decoding has failed, consider the segment as silence (default: 0.6) */
  no_speech_threshold?: number;
  /** Extract word-level timestamps and refine the results based on them (default: False) */
  word_timestamps?: boolean;
  /** If word_timestamps is True, merge these punctuation symbols with the next word (default: "'“¿([{-) */
  prepend_punctuations?: string;
  /** If word_timestamps is True, merge these punctuation symbols with the previous word (default: "'.。,，!！?？:：”)]}、) */
  append_punctuations?: string;
  /** (Requires --word_timestamps True) Underline each word as it is spoken in srt and vtt (default: False) */
  highlight_words?: boolean;
  /** (Requires --word_timestamps True) The maximum number of characters in a line before breaking the line (default: None) */
  max_line_width?: number;
  /** (Requires --word_timestamps True) The maximum number of lines in a segment (default: None) */
  max_line_count?: number;
  /** The maximum number of characters per line */
  max_words_per_line?: number;
  /** Number of threads used by torch for CPU inference; supercedes MKL_NUM_THREADS/OMP_NUM_THREADS (default: 0) */
  threads?: number;
}

export interface Proto<K> {
  file: string;
  getContent: () => Promise<"json" extends K ? AudioToTextJSON : string>;
}

export type AudioToTextFiles = {
  [format in OutputFormat]: Proto<format>;
};

export interface AudioToTextJSON {
  text: string;
  segments: Segment[];
  language: string;
}

interface Segment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}
