import React from "react";
import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link href="/" className="relative hidden h-11 w-[150px] md:block">
      <Image
        src="/images/TENANT.png"
        alt="TENANT home"
        fill
        sizes="150px"
        priority
        unoptimized
        className="object-contain"
      />
    </Link>

  );
};

export default Logo;