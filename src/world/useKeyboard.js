import { useEffect, useState } from "react";

export default function useKeyboard(enabled = true) {
  const [keys, setKeys] = useState({});

  // modal açılınca basılı tuşlar takılı kalmasın
  useEffect(() => {
    if (!enabled) setKeys({});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const down = (e) => setKeys((k) => ({ ...k, [e.code]: true }));
    const up = (e) => setKeys((k) => ({ ...k, [e.code]: false }));

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);

  return keys;
}
