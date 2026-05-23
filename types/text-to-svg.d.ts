declare module "text-to-svg" {
  interface PathOptions {
    x?: number;
    y?: number;
    fontSize?: number;
    kerning?: boolean;
    letterSpacing?: number;
    tracking?: number;
    anchor?: string;
    attributes?: Record<string, string | number>;
  }

  class TextToSVG {
    static loadSync(fontPath?: string): TextToSVG.Instance;
  }

  namespace TextToSVG {
    interface Instance {
      getPath(text: string, options?: PathOptions): string;
    }
  }

  export = TextToSVG;
}
