"use client";
import React, { useState, useCallback, useRef } from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { toast } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { useSession } from "next-auth/react";

import { cn } from "@/utils/helper";
import { updateFavorite } from "@/services/favorite";

interface HeartButtonProps {
  listingId: string;
  hasFavorited: boolean;
}

const HeartButton: React.FC<HeartButtonProps> = ({
  listingId,
  hasFavorited: initialValue,
}) => {
  const { status } = useSession();
  const [hasFavorited, setHasFavorited] = useState(initialValue);
  const hasFavoritedRef = useRef(initialValue);
  const { mutate } = useMutation({
    mutationFn: updateFavorite,
    onError: () => {
      hasFavoritedRef.current = !hasFavoritedRef.current;
      setHasFavorited(hasFavoritedRef.current);
      toast.error("Failed to favorite");
    }
  });

  const debouncedUpdateFavorite = debounce(() => {
    mutate({
      listingId,
      favorite: hasFavoritedRef.current,
    });
  }, 300);

  const handleUpdate = useCallback(() => {
    debouncedUpdateFavorite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    if (status !== "authenticated") {
      toast.error("Please sign in to favorite the listing!");
      return;
    }

    handleUpdate();
    setHasFavorited((prev) => !prev);
    hasFavoritedRef.current = !hasFavoritedRef.current;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={hasFavorited ? "Remove from favorites" : "Add to favorites"}
      className="relative z-[5] flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center transition hover:opacity-80"
    >
      <AiOutlineHeart
        size={28}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-50"
      />
      <AiFillHeart
        size={24}
        className={cn(hasFavorited ? "fill-primary" : "fill-neutral-500/70")}
      />
    </button>
  );
};

export default HeartButton;
