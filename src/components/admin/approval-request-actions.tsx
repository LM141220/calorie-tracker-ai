"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reviewAccountRequestAction } from "@/features/admin/actions";

export function ApprovalRequestActions({ profileId }: { profileId: string }) {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function review(decision: "approved" | "rejected") {
    setMessage("");
    startTransition(async () => {
      const result = await reviewAccountRequestAction({
        profileId,
        decision,
        comment,
      });
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <label
        className="block text-sm font-medium"
        htmlFor={`comment-${profileId}`}
      >
        Commentaire interne (facultatif)
      </label>
      <textarea
        className="field-premium min-h-20 resize-y"
        disabled={isPending}
        id={`comment-${profileId}`}
        maxLength={1000}
        onChange={(event) => setComment(event.target.value)}
        value={comment}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() => review("approved")}
          type="button"
        >
          Approuver
        </Button>
        <Button
          disabled={isPending}
          onClick={() => review("rejected")}
          type="button"
          variant="outline"
        >
          Refuser
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
