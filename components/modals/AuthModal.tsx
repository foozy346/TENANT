"use client";
import React, { useTransition, useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import Heading from "../Heading";
import Input from "../inputs/Input";
import Button from "../Button";
import Modal from "./Modal";
import SpinnerMini from "../Loader";
import { registerUser } from "@/services/auth";

const AuthModal = ({
  name,
  onCloseModal,
}: {
  name?: string;
  onCloseModal?: () => void;
}) => {
  const [isLoading, startTransition] = useTransition();
  const [title, setTitle] = useState(name || "");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setError,
    setFocus,
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });
  const router = useRouter();
  const isLoginModal = title === "Login";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoginModal) {
        setFocus("email");
      } else {
        setFocus("name");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoginModal, setFocus]);

  const onToggle = () => {
    const newTitle = isLoginModal ? "Sign up" : "Login";
    setTitle(newTitle);
    reset();
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    const { email, password, name } = data;

    startTransition(async () => {
      try {
        if (isLoginModal) {
          const callback = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (callback?.error) {
            throw new Error(callback.error);
          }
          if (callback?.ok) {
            toast.success("You've successfully logged in.");
            onCloseModal?.();
            router.refresh();
          }
        } else {
          await registerUser({ email, password, name });
          setTitle("Login");
          toast.success("You've successfully registered.");
          reset();
        }
      } catch (error: any) {
        toast.error(error.message);
        if (isLoginModal) {
          reset();
          setError("email", {});
          setError("password", {});
          setTimeout(() => {
            setFocus("email");
          }, 100)
        }
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Modal.WindowHeader title={title} />

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <Heading
            title={!isLoginModal ? "Welcome to TENANT" : "Welcome back"}
            subtitle={
              title === "Sign up"
                ? "Create an account!"
                : "Login to your account!"
            }
          />

          {!isLoginModal && (
            <Input
              id="name"
              label="Name"
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              watch={watch}
            />
          )}

          <Input
            id="email"
            label="Email"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            watch={watch}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            watch={watch}
          />
        </div>

        <div className="shrink-0 space-y-2 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-5">
          <Button type="submit" className="flex h-11 items-center justify-center">
            {isLoading ? <SpinnerMini className="h-5 w-5" /> : "Continue"}
          </Button>

          <Button
            type="button"
            outline
            onClick={() => signIn("google")}
            className="flex h-11 flex-row items-center justify-center gap-2 px-3 py-2"
          >
            <FcGoogle className="h-6 w-6" />
            <span>Continue with Google</span>
          </Button>

          <div className="pt-1 text-center text-sm font-light text-neutral-600">
            <span>
              {!isLoginModal
                ? "Already have an account?"
                : "First time using TENANT?"}
            </span>
            <button
              type="button"
              onClick={onToggle}
              className="ms-1 min-h-11 px-1 font-medium text-neutral-800 hover:underline"
            >
              {!isLoginModal ? "Log in" : "Create an account"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AuthModal;
