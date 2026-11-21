import { GenerateContentConfig } from "@google/genai";

type CowModels = {
  [key: string]: {
    name: string;
    config: GenerateContentConfig;
  };
};

export type HttpMethods =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";
