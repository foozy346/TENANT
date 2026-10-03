import React from "react";
import BackButton from "./BackButton";

interface HeadingProps {
  title: string;
  subtitle?: string;
  center?: boolean;
  backBtn?: boolean;
}

const Heading: React.FC<HeadingProps> = ({
  title,
  subtitle,
  center,
  backBtn = false,
}) => {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className={`min-w-0 flex-1 ${center ? "text-center" : "text-start"}`}>
        <h3 className="break-words text-[22px] font-bold leading-[1.25] sm:text-2xl">
          {title}
        </h3>
        <p className="mt-2 break-words font-light text-neutral-500 md:mt-1">
          {subtitle}
        </p>
      </div>
      {backBtn ? <BackButton /> : null}
    </div>
  );
};

export default Heading;
