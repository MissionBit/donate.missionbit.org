declare module "us" {
  // Incomplete mapping of the us module
  export interface State {
    readonly name: string;
    readonly abbr: string;
  }
  const us: {
    readonly states: Partial<{ readonly [state: State["abbr"]]: State }>;
    readonly STATES: readonly State[];
    readonly TERRITORIES: readonly State[];
    readonly STATES_AND_TERRITORIES: readonly State[];
  };
  export default us;
}
