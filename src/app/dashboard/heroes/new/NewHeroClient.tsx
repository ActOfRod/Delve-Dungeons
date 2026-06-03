"use client";

import { useRouter } from "next/navigation";
import { CharacterForm } from "../../CharacterForm";

export function NewHeroClient() {
  const router = useRouter();
  return (
    <CharacterForm
      onDone={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
