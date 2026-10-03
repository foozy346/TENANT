import React, { Suspense } from "react";
import Logo from "./Logo";
import Search from "./Search";
import Categories from "./Categories";
import UserMenu from "./UserMenu";
import { getCurrentUser } from "@/services/user";

interface NavbarProps {}

const Navbar: React.FC<NavbarProps> = async () => {
  const user = await getCurrentUser();

  return (
    <header className="fixed left-0 top-0 z-30 w-full bg-white">
      <nav className="border-b-[1px] py-2 sm:py-3">
        <div className="main-container flex min-w-0 flex-row items-center gap-2">
          <Logo />
          <Suspense fallback={<></>}>
            <Search />
          </Suspense>
          <UserMenu user={user} />
        </div>
      </nav>
      <Categories />
    </header>
  );
};

export default Navbar;
