"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setFoodFavoriteAction } from "@/features/meals/actions";

export function FavoriteFoodButton({
  mealItemId,
  isFavorite,
}: {
  mealItemId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleFavorite() {
    setMessage("");
    startTransition(async () => {
      const result = await setFoodFavoriteAction(mealItemId, !isFavorite);
      setMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2">
      <Button
        aria-pressed={isFavorite}
        disabled={isPending}
        onClick={toggleFavorite}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Heart
          aria-hidden="true"
          className={`mr-2 size-4 ${isFavorite ? "fill-current text-primary" : ""}`}
        />
        {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      </Button>
      {message ? (
        <p className="mt-1 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
