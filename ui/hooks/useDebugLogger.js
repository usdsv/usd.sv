import { useEffect } from "react";

export function useDebugLogger(...args) {
  useEffect(
    () => {
      args.forEach((item) => console.log(item.label, item.value));
    },
    args.map((item) => item.value)
  );
}
