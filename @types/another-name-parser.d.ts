declare module "another-name-parser" {
  export default function parser(name: string): {
    prefix: null | string;
    first: null | string;
    middle: null | string;
    last: null | string;
    suffix: null | string;
    original: string;
  };
}
