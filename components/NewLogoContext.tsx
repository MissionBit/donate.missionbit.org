import { ParsedUrlQuery } from "querystring";
import * as React from "react";

export const NewLogoContext = React.createContext(!!process.env.USE_NEW_LOGO);

export function newLogoFromQuery(query: ParsedUrlQuery): boolean {
  return "logo" in query || !!process.env.USE_NEW_LOGO;
}

export function useNewLogo(): boolean {
  return React.useContext(NewLogoContext);
}
