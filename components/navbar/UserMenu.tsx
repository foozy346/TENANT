"use client";
import React, { useEffect, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User } from "next-auth";

import Avatar from "../Avatar";
import MenuItem from "./MenuItem";
import Menu from "@/components/Menu";
import RentModal from "../modals/RentModal";
import Modal from "../modals/Modal";
import AuthModal from "../modals/AuthModal";
import { menuItems } from "@/utils/constants";

interface UserMenuProps {
  user?: User;
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const router = useRouter();
  const [initialModalName, setInitialModalName] = useState("");

  useEffect(() => {
    if (user || new URLSearchParams(window.location.search).get("auth") !== "login") {
      return;
    }
    setInitialModalName("Login");
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete("auth");
    const query = searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  }, [router, user]);

  const redirect = (url: string) => {
    router.push(url);
  };

  return (
    <div className="relative ms-auto shrink-0">
      <div className="flex flex-row items-center gap-3">
        <Modal initialOpenName={initialModalName}>
          <Modal.Trigger name={user ? "share" : "Login"}>
            <button
              type="button"
              className="hidden md:block text-sm font-bold py-3 px-4 rounded-full hover:bg-neutral-100 transition cursor-pointer text-[#585858]"
            >
              Share your home
            </button>
          </Modal.Trigger>
          <Menu>
            <Menu.Toggle id="user-menu">
              <button
                type="button"
                aria-label="Open account menu"
                className="flex h-11 shrink-0 flex-row items-center gap-1.5 rounded-full border border-neutral-200 px-2 transition duration-300 hover:shadow-md md:gap-2.5 md:px-3"
              >
                <AiOutlineMenu className="h-4 w-4 shrink-0" />
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <Avatar src={user?.image} />
                </div>
              </button>
            </Menu.Toggle>
            <Menu.List className="shadow-[0_0_36px_4px_rgba(0,0,0,0.075)] rounded-xl bg-white text-sm">
              {user ? (
                <>
                  <MenuItem label="Dashboard" onClick={() => redirect("/dashboard")} />
                  <hr />
                  {menuItems.map((item) => (
                    <MenuItem
                      label={item.label}
                      onClick={() => redirect(item.path)}
                      key={item.label}
                    />
                  ))}

                  <Modal.Trigger name="share">
                    <MenuItem label="Share your home" />
                  </Modal.Trigger>
                  <hr />
                  <MenuItem label="Log out" onClick={signOut} />
                </>
              ) : (
                <>
                  <Modal.Trigger name="Login">
                    <MenuItem label="Log in" />
                  </Modal.Trigger>

                  <Modal.Trigger name="Sign up">
                    <MenuItem label="Sign up" />
                  </Modal.Trigger>
                </>
              )}
            </Menu.List>
          </Menu>
          <Modal.Window name="Login">
            <AuthModal name="Login" />
          </Modal.Window>
          <Modal.Window name="Sign up">
            <AuthModal name="Sign up" />
          </Modal.Window>
          <Modal.Window name="share">
            <RentModal />
          </Modal.Window>
        </Modal>
      </div>
    </div>
  );
};

export default UserMenu;
