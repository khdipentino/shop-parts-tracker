// jsbarcode doesn't ship its own TypeScript types; this is a minimal
// ambient declaration covering how this app uses it.
declare module "jsbarcode" {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
    background?: string;
    lineColor?: string;
  }

  function JsBarcode(
    element: SVGElement | HTMLElement | string,
    value: string,
    options?: JsBarcodeOptions
  ): void;

  export default JsBarcode;
}
