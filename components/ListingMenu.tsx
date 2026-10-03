"use client";
import React, { FC, useTransition } from "react";
import { BsThreeDots } from "react-icons/bs";
import { usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Menu from "./Menu";
import Modal from "./modals/Modal";
import ConfirmDelete from "./ConfirmDelete";

import { deleteProperty } from "@/services/properties";
import { deleteReservation } from "@/services/reservation";

const pathNameDict: { [x: string]: string } = {
  "/properties": "Delete property",
  "/trips": "Cancel reservation",
  "/reservations": "Cancel guest reservation",
};

interface ListingMenuProps {
  id: string;
}

const ListingMenu: FC<ListingMenuProps> = ({ id }) => {
  const pathname = usePathname();
  const { mutate: deleteListing } = useMutation({
    mutationFn: deleteProperty,
  });
  const { mutate: cancelReservation } = useMutation({
    mutationFn: deleteReservation,
  });
  const [isLoading, startTransition] = useTransition();

  if (!pathNameDict[pathname]) return null;

  const onConfirm = (onModalClose?: () => void) => {
    startTransition(() => {
      try {
        if (pathname === "/properties") {
          deleteListing(id, {
            onSuccess: () => {
              onModalClose?.();
              toast.success("Listing successfully deleted!");
            },
          });
        } else if (pathname === "/trips" || pathname === "/reservations") {
          cancelReservation(id, {
            onSuccess: () => {
              onModalClose?.();
              toast.success("Reservation successfully cancelled!");
            },
          });
        }
      } catch (error) {
        toast.error("Oops! Something went wrong. Please try again later.");
        onModalClose?.()
      }
    });
  };

  return (
    <Modal>
      <Menu>
        <Menu.Toggle
          id="lisiting-menu"
          className="w-10 h-10 flex items-center z-5 justify-center"
        >
          <button
            type="button"
            aria-label="Listing actions"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-700/50 transition duration-200 group-hover:bg-neutral-700/70 z-[5]"
          >
            <BsThreeDots className="h-[18px] w-[18px] text-gray-300 transition duration-100 group-hover:text-gray-100 " />
          </button>
        </Menu.Toggle>
        <Menu.List position="bottom-left" className="rounded-md">
          <Modal.Trigger name="confirm-delete">
            <Menu.Button className="text-[14px] rounded-md font-semibold py-[10px] hover:bg-neutral-100 transition">
              {pathNameDict[pathname]}
            </Menu.Button>
          </Modal.Trigger>
        </Menu.List>
      </Menu>
      <Modal.Window name="confirm-delete">
        <ConfirmDelete
          onConfirm={onConfirm}
          title={pathNameDict[pathname]}
          isLoading={isLoading}
        />
      </Modal.Window>
    </Modal>
  );
};

export default ListingMenu;
