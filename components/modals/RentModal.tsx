"use client";
import React, { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import type { Listing } from "@prisma/client";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import Modal from "./Modal";
import Button from "../Button";
import SpinnerMini from "../Loader";
import Heading from "../Heading";
import Counter from "../inputs/Counter";
import Input from "../inputs/Input";
import CategoryButton from "../inputs/CategoryButton";
import CountrySelect, { CountrySelectValue } from "../inputs/CountrySelect";
import ImageUpload from "../ImageUpload";

import { categories } from "@/utils/constants";
import countries from "@/data/countries.json";
import { createListing, updateListing } from "@/services/listing";
import { getPricePeriod } from "@/utils/helper";

const steps = {
  "0": "category",
  "1": "location",
  "2": "guestCount",
  "3": "image",
  "4": "title",
  "5": "price",
};

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION = 4,
  PRICE = 5,
}

type RentModalProps = {
  onCloseModal?: () => void;
  onSaved?: () => void;
  listing?: Listing | null;
  mode?: "create" | "edit";
};

const getFormDefaults = (listing?: Listing | null) => {
  const savedCountry = listing?.country
    ? (countries as CountrySelectValue[]).find(
        (country) => country.label === listing.country
      )
    : undefined;

  return {
    category: listing?.category ?? "Apartments",
    location: listing?.country
      ? {
          flag: savedCountry?.flag ?? "",
          label: listing.country,
          region: listing.region ?? savedCountry?.region ?? "Alexandria",
          value: savedCountry?.value ?? listing.country,
          latlng: listing.latlng.length === 2 ? listing.latlng : savedCountry?.latlng ?? [],
        }
      : null,
    guestCount: listing?.guestCount ?? 1,
    bathroomCount: listing?.bathroomCount ?? 1,
    roomCount: listing?.roomCount ?? 1,
    image: listing?.imageSrc ?? "",
    imageUrls: listing?.imageUrls?.length
      ? listing.imageUrls
      : listing?.imageSrc
        ? [listing.imageSrc]
        : [],
      price: listing ? String(listing.price) : "",
      pricePeriod: listing
        ? getPricePeriod(listing.pricePeriod, listing.priceType)
        : "monthly",
    depositAmount: String(listing?.depositAmount ?? 0),
    furnished: listing?.furnished ?? false,
    status: listing?.status ?? "available",
    isHidden: listing?.isHidden ?? false,
    title: listing?.title ?? "",
    description: listing?.description ?? "",
  };
};

const RentModal = ({
  onCloseModal,
  onSaved,
  listing,
  mode = "create",
}: RentModalProps) => {
  const isEditMode = mode === "edit" && !!listing;
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, startTransition] = useTransition();
  const [isLocationPinned, setIsLocationPinned] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
    getValues,
  } = useForm<FieldValues>({
    defaultValues: getFormDefaults(listing),
  });

  useEffect(() => {
    reset(getFormDefaults(listing));
    setStep(STEPS.CATEGORY);
    setIsLocationPinned(listing?.latlng.length === 2);
  }, [listing, reset]);

  useEffect(() => {
    if (!isEditMode || !isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, isEditMode]);

  const requestClose = () => {
    if (isEditMode && isDirty && !window.confirm("Discard unsaved listing changes?")) {
      return;
    }
    onCloseModal?.();
  };

  const location = watch("location");
  const country = location?.label;

  const Map = useMemo(
    () =>
      dynamic(() => import("../Map"), {
        ssr: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [country]
  );

  const setCustomValue = (id: string, value: any) => {
    if (id === "location") {
      setIsLocationPinned(false);
    }
    setValue(id, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onCoordinateSelect = (coordinates: number[]) => {
    const currentLocation = getValues("location");
    if (!currentLocation) return;

    setCustomValue("location", { ...currentLocation, latlng: coordinates });
    setIsLocationPinned(true);
  };

  const onBack = () => {
    setStep((value) => value - 1);
  };

  const onNext = () => {
    setStep((value) => value + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (step !== STEPS.PRICE) return onNext();

    startTransition(async () => {
      try {
        if (isEditMode && listing) {
          await updateListing(listing.id, data);
          toast.success("Listing changes saved.");
          reset(data);
          onSaved?.();
          onCloseModal?.();
          router.refresh();
          return;
        }

        const newListing = await createListing(data);
        toast.success(`${data.title} added successfully!`);
        queryClient.invalidateQueries({
          queryKey: ["listings"],
        });
        reset(getFormDefaults());
        setIsLocationPinned(false);
        setStep(STEPS.CATEGORY);
        onCloseModal?.();
        router.refresh();
        router.push(`/listings/${newListing.id}`);
      } catch (error: any) {
        toast.error(
          process.env.NODE_ENV === "development" && error?.message
            ? error.message
            : "Failed to create listing!"
        );
        console.error("Failed to create listing:", error);
      }
    });
  };

  const body = () => {
    const pricePeriod = watch("pricePeriod");

    switch (step) {
      case STEPS.LOCATION:
        return (
          <div className="flex flex-col gap-6">
            <Heading
              title="Where is your place located?"
              subtitle="Help guests find you!"
            />
            <CountrySelect value={location} onChange={setCustomValue} />
            <div className="h-[240px]">
              <Map
                center={location?.latlng}
                onCoordinateSelect={onCoordinateSelect}
                showCenterMarker={isLocationPinned}
              />
            </div>
            <p className="-mt-4 text-sm text-neutral-500">
              {isLocationPinned && location?.latlng?.length === 2
                ? `Pinned coordinates: ${location.latlng[0].toFixed(5)}, ${location.latlng[1].toFixed(5)}`
                : "Choose an area, then click the map to pin the exact location."}
            </p>
          </div>
        );

      case STEPS.INFO:
        return (
          <div className="flex flex-col gap-6">
            <Heading
              title="Share some basics about your place"
              subtitle="What amenitis do you have?"
            />
            <Counter
              title="Guests"
              subtitle="How many guests do you allow?"
              watch={watch}
              onChange={setCustomValue}
              name="guestCount"
            />
            <hr />
            <Counter
              onChange={setCustomValue}
              watch={watch}
              title="Rooms"
              subtitle="How many rooms do you have?"
              name="roomCount"
            />
            <hr />
            <Counter
              onChange={setCustomValue}
              watch={watch}
              title="Bathrooms"
              subtitle="How many bathrooms do you have?"
              name="bathroomCount"
            />
          </div>
        );

      case STEPS.IMAGES:
        return (
          <div className="flex flex-col gap-6">
            <Heading
              title="Add photos of your place"
              subtitle="Upload up to 10 photos."
            />
            <ImageUpload
              onChange={setCustomValue}
              initialImages={getValues("imageUrls")}
              initialMainImage={getValues("image")}
            />
          </div>
        );

      case STEPS.DESCRIPTION:
        return (
          <div className="flex flex-col gap-6">
            <Heading
              title="How would you describe your place?"
              subtitle="Short and sweet works best!"
            />
            <Input
              id="title"
              label="Title"
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              watch={watch}
              autoFocus
            />
            <hr />
            <Input
              id="description"
              label="Description"
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              watch={watch}
            />
          </div>
        );

      case STEPS.PRICE:
        return (
          <div className="flex flex-col gap-6">
            <Heading
              title="Now, set your price"
              subtitle={
                pricePeriod === "monthly"
                  ? "Set the price for each calendar month."
                  : pricePeriod === "weekly"
                    ? "Set the price for each 7-night period."
                    : "Set the amount guests pay for each night."
              }
            />
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Rental price period">
              {[
                { value: "monthly", label: "Monthly" },
                { value: "weekly", label: "Weekly" },
                { value: "nightly", label: "Nightly" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCustomValue("pricePeriod", option.value)}
                  aria-pressed={pricePeriod === option.value}
                  className={`rounded-md border px-4 py-3 text-sm font-semibold transition ${
                    pricePeriod === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-neutral-200 text-neutral-600 hover:border-primary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Input
              key="price"
              id="price"
              label={`${pricePeriod === "monthly" ? "Monthly" : pricePeriod === "weekly" ? "Weekly" : "Nightly"} price (EGP)`}
              type="number"
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              watch={watch}
              autoFocus
            />
            <Input
              id="depositAmount"
              label="Deposit (EGP)"
              type="number"
              min={0}
              disabled={isLoading}
              register={register}
              errors={errors}
              watch={watch}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-neutral-800">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--primary)]"
                disabled={isLoading}
                {...register("furnished")}
              />
              Furnished
            </label>
            {isEditMode && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Listing status</span>
                  <select
                    disabled={isLoading}
                    {...register("status")}
                    className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base"
                  >
                    <option value="available">Available</option>
                    <option value="reserved" disabled>Reserved by an accepted booking</option>
                    <option value="rented">Rented</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--primary)]"
                    disabled={isLoading}
                    {...register("isHidden")}
                  />
                  Hide this listing from guests
                </label>
              </>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col gap-2">
            <Heading
              title="Which of these best describes your place?"
              subtitle="Pick a category"
            />
            <div className="flex-1 grid grid-cols-2  gap-3 max-h-[60vh] lg:max-h-[260px] overflow-y-scroll scroll-smooth">
              {categories.map((item) => (
                  <CategoryButton
                    onClick={setCustomValue}
                    watch={watch}
                    label={item.label}
                    icon={item.icon}
                    key={item.label}
                  />
              ))}
            </div>
          </div>
        );
    }
  };

  const isFieldFilled =
    !!getValues(steps[step]) &&
    (step !== STEPS.LOCATION || isLocationPinned);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Modal.WindowHeader
        title={isEditMode ? "Edit listing" : "Share your home!"}
        onRequestClose={requestClose}
      />
      <form
        className="relative flex min-h-0 flex-1 flex-col border-0 bg-white outline-none focus:outline-none"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {body()}
        </div>
        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-5">
          <div className="flex flex-row items-center gap-4 w-full">
            {isEditMode && (
              <Button
                type="button"
                className="flex min-h-11 items-center justify-center"
                onClick={requestClose}
                outline
              >
                Cancel
              </Button>
            )}
            {step !== STEPS.CATEGORY ? (
              <Button
                type="button"
                className="flex items-center gap-2 justify-center"
                onClick={onBack}
                outline
              >
                Back
              </Button>
            ) : null}
            <Button
              type="submit"
              className="flex items-center gap-2 justify-center"
              disabled={isLoading || !isFieldFilled}
            >
              {isLoading ? (
                <SpinnerMini />
              ) : step === STEPS.PRICE ? (
                isEditMode ? "Save" : "Create"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RentModal;
