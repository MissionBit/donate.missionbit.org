import { createTheme } from "@material-ui/core/styles";
import { red, common } from "@material-ui/core/colors";
import { brand, ssBrand } from "./colors";

const commonFontFamilies = [
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
];

const baseFontFamily = ["Montserrat", ...commonFontFamilies].join(",");
const headerFontFamily = ["Montserrat", ...commonFontFamilies].join(",");
const headerStyles = {
  fontFamily: headerFontFamily,
  color: ssBrand.black,
  fontWeight: 500,
};
const bigHeaderStyles = {
  ...headerStyles,
  color: ssBrand.black,
  fontWeight: 700,
};

export const themeOptions = {
  palette: {
    primary: {
      main: ssBrand.teal,
    },
    secondary: {
      main: ssBrand.purple,
    },
    error: {
      main: red.A400,
    },
    background: {
      default: common.white,
    },
    text: {
      primary: ssBrand.black,
      secondary: ssBrand.black,
    },
  },
  typography: {
    fontFamily: baseFontFamily,
    h1: bigHeaderStyles,
    h2: bigHeaderStyles,
    h3: bigHeaderStyles,
    h4: headerStyles,
    h5: headerStyles,
    h6: headerStyles,
    button: {
      textTransform: "inherit",
    },
  },
  overrides: {
    MuiButton: {
      contained: {
        fontWeight: 700,
      },
      outlined: {
        fontWeight: 700,
      },
      outlinedPrimary: {
        color: brand.orange,
        border: `2px solid ${brand.orange}`,
        "&:hover": {
          border: `2px solid ${brand.orange}`,
          backgroundColor: brand.orange,
          color: common.white,
        },
      },
      outlinedSecondary: {
        color: brand.blue,
        border: `2px solid ${brand.blue}`,
        "&:hover": {
          border: `2px solid ${brand.blue}`,
          backgroundColor: brand.blue,
          color: common.white,
        },
      },
    },
  },
} as const;

export const theme = createTheme(themeOptions);
export default theme;
