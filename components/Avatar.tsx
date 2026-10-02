"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
}

const Avatar: React.FC<AvatarProps> = ({ src }) => {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  return (
    <Image
      className="h-7 w-7 rounded-full object-cover select-none"
      height={28}
      width={28}
      alt="Avatar"
      src={src && !hasImageError ? src : "/images/placeholder.jpg"}
      onError={() => setHasImageError(true)}
      unoptimized
    />
  );
};

export default Avatar;
