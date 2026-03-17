import type { backendInterface } from "../backend.d";
import { useActor } from "./useActor";

/**
 * Returns the actor typed with the updated backendInterface from backend.d.ts.
 * backend.ts is auto-generated and may lag behind; this hook provides the
 * properly-typed actor without modifying generated files.
 */
export function useTypedActor() {
  const { actor, isFetching } = useActor();
  return {
    actor: actor as unknown as backendInterface | null,
    isFetching,
  };
}
