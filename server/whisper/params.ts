import { AudioToTextOptions } from "./types";

const getEntries = <T extends object>(obj: T) => {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
};

export const getParams = (options?: AudioToTextOptions) => {
  const params: string[] = [];
  if (options) {
    for (const [key, value] of getEntries(options)) {
      // replace '_' with '-' in key
      const newKey = key.replace("_", "-");
      if (value === undefined) continue;
      if (typeof value === "boolean") {
        params.push(`--${newKey}`, value ? "True" : "False");
      } else {
        params.push(`--${newKey}`, value.toString());
      }
    }
  }
  return params;
};
