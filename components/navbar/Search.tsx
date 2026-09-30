"use client";
import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FaSearch } from "react-icons/fa";

import Modal from "../modals/Modal";

const SearchModal = dynamic(() => import("@/components/modals/SearchModal"), {
  ssr: false
});

const Search = () => {
  const searchParams = useSearchParams();
  const guestCount = searchParams?.get("guestCount");
  const guestLabel = guestCount ? `${guestCount} Guests` : "Search";

  return (
    <Modal>
      <div className="flex w-full items-center rounded-full border-[1px] shadow-sm transition duration-300 hover:shadow-md md:w-auto">
        <Link
          href="/map"
          className="flex items-center px-5 py-2 text-sm font-bold text-primary"
        >
          Map
        </Link>
        <Modal.Trigger name="search">
          <button type="button" className="rounded-full py-1 pl-4 pr-2">
            <div className="flex flex-row items-center gap-4 text-sm text-gray-600">
              <small className="hidden sm:block font-normal text-sm">
                {guestLabel}
              </small>
              <div className="p-2 bg-brand-gradient rounded-full text-white">
                <FaSearch aria-hidden="true" className="text-[12px]" />
              </div>
            </div>
          </button>
        </Modal.Trigger>
      </div>
      <Modal.Window name="search">
        <SearchModal />
      </Modal.Window>
    </Modal>
  );
};

export default Search;
