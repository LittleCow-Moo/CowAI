declare module "weather-js" {
  export interface FindOptions {
    search: string;
    degreeType?: string;
    lang?: string;
    timeout?: number;
  }

  export interface WeatherLocation {
    [key: string]: string | undefined;
  }

  export interface WeatherCurrent {
    [key: string]: string | undefined;
  }

  export interface WeatherResult {
    location: WeatherLocation;
    current: WeatherCurrent;
    forecast?: Array<Record<string, string | undefined>> | null;
  }

  export type FindCallback = (
    error: Error | string | null,
    result: WeatherResult[],
  ) => void;

  export function find(options: FindOptions, callback: FindCallback): void;

  const weather: {
    find: typeof find;
  };

  export = weather;
}
