"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMealAction } from "@/features/meals/actions";
import { Button } from "@/components/ui/button";

type DeleteMealButtonProps = {
  mealId: string;
};

export function DeleteMealButton({ mealId }: DeleteMealButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function removeMeal() {
    if (!window.confirm("Supprimer définitivement ce repas ?")) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await deleteMealAction(mealId);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      router.push("/meal/new");
      router.refresh();
    });
  }

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={removeMeal}
        type="button"
        variant="destructive"
      >
        {isPending ? "Suppression…" : "Supprimer le repas"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
