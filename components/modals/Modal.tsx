"use client";
import React, {
  FC,
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { createPortal } from "react-dom";

import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useIsClient } from "@/hooks/useIsClient";
import { useKeyPress } from "@/hooks/useKeyPress";
import { fadeIn, slideIn } from "@/utils/motion";

interface ModalProps {
  children: ReactNode;
  initialOpenName?: string;
}

interface TriggerProps {
  name: string;
  children: ReactElement;
}

interface WindowProps extends TriggerProps {
  dismissOnOutside?: boolean;
  dismissOnEscape?: boolean;
}

interface WindowHeaderProps {
  title: string;
  onRequestClose?: () => void;
}

const ModalContext = createContext({
  open: (val: string) => { },
  close: () => { },
  openName: "",
});

const Modal: FC<ModalProps> & {
  Trigger: typeof Trigger;
  Window: typeof Window;
  WindowHeader: typeof WindowHeader;
} = ({ children, initialOpenName = "" }) => {
  const [openName, setOpenName] = useState(initialOpenName);

  useEffect(() => {
    if (initialOpenName) setOpenName(initialOpenName);
  }, [initialOpenName]);

  const close = useCallback(() => {
    setOpenName("");
  }, []);

  const open = setOpenName;
  return (
    <ModalContext.Provider
      value={{
        open,
        close,
        openName,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

const Trigger: FC<TriggerProps> = ({ children, name }) => {
  const { open } = useContext(ModalContext);
  const childOnClick = children.props.onClick as
    | ((event: React.MouseEvent<HTMLElement>) => void)
    | undefined;
  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    childOnClick?.(event);
    if (event.defaultPrevented) return;
    open(name);
  };
  return cloneElement(children, { onClick });
};

const Window: FC<WindowProps> = ({
  children,
  name,
  dismissOnOutside = true,
  dismissOnEscape = true,
}) => {
  const { openName, close } = useContext(ModalContext);
  const isWindowOpen = openName === name;
  const { ref } = useOutsideClick({
    action: close,
    enable: isWindowOpen && dismissOnOutside,
  });

  useKeyPress({
    key: "Escape",
    action: close,
    enable: isWindowOpen && dismissOnEscape
  })

  const isClient = useIsClient();


  useEffect(() => {
    if (!isClient || !isWindowOpen) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollTop = window.scrollY;
    const previousOverflow = root.style.overflow;

    body.style.top = `-${scrollTop}px`;
    body.classList.add("no-scroll");
    root.style.overflow = "hidden";

    return () => {
      body.classList.remove("no-scroll");
      body.style.top = "";
      root.style.overflow = previousOverflow;
      window.scrollTo(0, scrollTop);
    };
  }, [isClient, isWindowOpen]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {isWindowOpen ? (
        <motion.div
          variants={fadeIn}
          animate="show"
          initial="hidden"
          exit="hidden"
          className="fixed inset-0 z-[60] flex h-[100dvh] w-full items-stretch justify-center overflow-hidden bg-neutral-800/70 outline-none focus:outline-none md:items-center md:p-4"
        >
          <motion.div
            variants={slideIn("up", "tween", 0.3)}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-lg md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-[420px] md:rounded-lg md:pt-0"
            ref={ref}
          >
            {cloneElement(children, { onCloseModal: close })}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

const WindowHeader: FC<WindowHeaderProps> = ({ title, onRequestClose }) => {
  const { close } = useContext(ModalContext);
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-neutral-200 px-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute start-2 flex h-11 w-11 items-center justify-center rounded-full border-0 transition hover:bg-neutral-100"
        onClick={onRequestClose ?? close}
      >
        <IoMdClose size={20} />
      </button>
      <h4 className="max-w-[calc(100%-3.5rem)] truncate text-lg font-semibold">
        {title}
      </h4>
    </header>
  );
};

Modal.Trigger = Trigger;
Modal.Window = Window;
Modal.WindowHeader = WindowHeader;

export default Modal;
