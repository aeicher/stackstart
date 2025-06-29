// Minimal ambient typing to satisfy the TypeScript compiler when
// '@octokit/rest' is not installed. If the real package is added,
// these types will be overridden by the actual declarations.
declare module '@octokit/rest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Octokit: any;
  // Allow importing the module default style (CommonJS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _default: any;
  export default _default;
}
