"use client";
import React from "react";
import { MdKeyboardBackspace } from "react-icons/md";
import { useMoveBack } from "@/hooks/useMoveBack";

const BackButton = () => {
  const back = useMoveBack();
  return (
    <button
      type="button"
      className="flex min-h-11 flex-row items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-[#585858] transition hover:bg-neutral-100"
      onClick={back}
    >
    <MdKeyboardBackspace size={18}/>
      <span>
        Back
      </span>
    </button>
  );
};

export default BackButton;
