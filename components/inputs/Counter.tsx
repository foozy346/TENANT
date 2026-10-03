"use client";

import React from "react";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { FieldValues, UseFormWatch } from "react-hook-form";

interface CounterProps {
  title: string;
  subtitle: string;
  onChange: (name: string, value: number) => void;
  name: string;
  watch: UseFormWatch<FieldValues>;
}

const Counter: React.FC<CounterProps> = ({
  title,
  subtitle,
  onChange,
  name,
  watch,
}) => {
  const value = watch(name);
  
  const onAdd = () => {
    onChange(name, value + 1);
  };

  const onReduce = () => {
    if (value === 1) return;
    onChange(name, value - 1);
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-col">
        <h3 className="font-semibold">{title}</h3>
        <p className="font-light text-gray-600 text-[15.5px]">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-row items-center gap-2 sm:gap-4">
        <button type="button"
          onClick={onReduce}
          aria-label={`Decrease ${title.toLowerCase()}`}
          className="h-11 w-11 rounded-full border-[1px] border-neutral-400 flex
          items-center justify-center text-neutral-600 cursor-pointer hover:opacity-80  transition"
        >
          <AiOutlineMinus />
        </button>
        <span className=" font-light text-lg text-neutral-600 select-none">
          {value}
        </span>
        <button type="button"
          onClick={onAdd}
          aria-label={`Increase ${title.toLowerCase()}`}
          className="h-11 w-11 rounded-full border-[1px] border-neutral-400 flex items-center justify-center text-neutral-600 cursor-pointer hover:opacity-80 transition"
          autoFocus={title === "Guests"}
        >
          <AiOutlinePlus />
        </button>
      </div>
    </div>
  );
};

export default Counter;
