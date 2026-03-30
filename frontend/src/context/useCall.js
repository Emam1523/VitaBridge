import { useContext } from "react";
import { CallContext } from "./callContextValue";

export function useCall() {
  return useContext(CallContext);
}
