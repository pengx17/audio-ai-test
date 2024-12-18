import fs from "node:fs/promises";
import { AllOutputFormats, Proto } from "./types";

export const getProto = <K extends AllOutputFormats>(
  key: K,
  value: string
): Proto<K> => {
  return {
    file: value,
    getContent: async () => {
      const content = await fs.readFile(value, { encoding: "utf8" });

      if (key === "json") return JSON.parse(content);
      return content;
    },
  };
};
