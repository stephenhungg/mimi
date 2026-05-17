// react 19's @types/react scopes jsx under React.JSX. @react-three/fiber v8
// augments the legacy global JSX namespace, which TS no longer reads under the
// new jsx transform. bridge fiber's ThreeElements into React.JSX here so all
// <mesh>, <boxGeometry>, etc. intrinsics resolve.

import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
