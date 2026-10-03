"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { FiMap } from "react-icons/fi";

import Modal from "../modals/Modal";
import SearchModal from "../modals/SearchModal";

const Search = () => {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  return (
    <Modal>
      <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <Modal.Trigger name="search">
          <button
            type="button"
            aria-label="Search apartments in Alexandria"
            className="flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-neutral-200 bg-white py-1 ps-3 pe-1 text-start text-sm text-neutral-700 shadow-sm transition hover:shadow-md md:w-[280px] md:flex-none md:ps-4"
          >
            <span className="truncate min-[360px]:hidden sm:hidden">Search</span>
            <span className="hidden truncate min-[360px]:inline sm:hidden">
              Search stays
            </span>
            <span className="hidden truncate sm:inline">
              Search apartments in Alexandria
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
              <FaSearch aria-hidden="true" className="text-sm" />
            </span>
          </button>
        </Modal.Trigger>
        <Link
          href={isMapPage ? "/" : "/map"}
          aria-label={isMapPage ? "Home" : "Map"}
          title={isMapPage ? "Home" : "Map"}
          className="flex h-11 w-auto min-w-11 shrink-0 items-center justify-center gap-1 rounded-full border border-neutral-200 px-2 text-primary transition hover:bg-neutral-50 md:gap-1.5 md:px-3"
        >
          {isMapPage ? (
            <Image
              src="/images/TENANT_logo.png"
              alt=""
              aria-hidden="true"
              width={62}
              height={60}
              className="h-[18px] w-auto shrink-0 object-contain"
              unoptimized
            />
          ) : (
            <FiMap aria-hidden="true" className="h-4 w-4 shrink-0" />
          )}
          <span className="text-xs font-semibold md:text-sm">
            {isMapPage ? "Home" : "Map"}
          </span>
        </Link>
      </div>
      <Modal.Window name="search">
        <SearchModal />
      </Modal.Window>
    </Modal>
  );
};

export default Search;
