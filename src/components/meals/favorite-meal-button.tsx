"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setMealFavoriteAction } from "@/features/meals/actions";

export function FavoriteMealButton({
  mealId,
  isFavorite,
}: {
  mealId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleFavorite() {
    setMessage("");
    startTransition(async () => {
      const result = await setMealFavoriteAction(mealId, !isFavorite);
      setMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <Button
        aria-pressed={isFavorite}
        disabled={isPending}
        onClick={toggleFavorite}
        type="button"
        variant="outline"
      >
        <Star
          aria-hidden="true"
          className={`mr-2 size-4 ${isFavorite ? "fill-current" : ""}`}
        />
        {isFavorite ? "Dans les favoris" : "Ajouter aux favoris"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
