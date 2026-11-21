import { GenerateContentConfig } from "@google/genai";

type CowModels = {
  [key: string]: {
    name: string;
    config: GenerateContentConfig;
  };
};