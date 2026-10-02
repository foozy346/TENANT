import React, { ChangeEvent, FC, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { FaStar } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { TbPhotoPlus } from "react-icons/tb";
import toast from "react-hot-toast";

import SpinnerMini from "./Loader";
import { useEdgeStore } from "@/lib/edgestore";
import { cn } from "@/utils/helper";

const MAX_IMAGES = 10;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  initialQuality: 0.82,
  useWebWorker: true,
};

const compressPhoto = (file: File) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.resolve(file);
  }

  return imageCompression(file, COMPRESSION_OPTIONS);
};

interface ImageUploadProps {
  onChange: (fieldName: string, value: string | string[]) => void;
  initialImages?: string[];
  initialMainImage?: string;
}

const ImageUpload: FC<ImageUploadProps> = ({
  onChange,
  initialImages = [],
  initialMainImage = "",
}) => {
  const [images, setImages] = useState(initialImages);
  const [mainImage, setMainImage] = useState(
    initialMainImage || initialImages[0] || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { edgestore } = useEdgeStore();

  const uploadImages = async (files: FileList | File[]) => {
    if (isLoading) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!imageFiles.length) {
      toast.error("Choose image files to upload.");
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      toast.error("You can upload up to 10 photos.");
      return;
    }
    if (imageFiles.length > remainingSlots) {
      toast.error("You can upload up to 10 photos.");
    }

    setIsLoading(true);
    try {
      const uploads = await Promise.all(
        imageFiles.slice(0, remainingSlots).map(async (file) => {
          const compressedFile = await compressPhoto(file);
          return edgestore.publicFiles.upload({ file: compressedFile });
        })
      );
      const nextImages = [...images, ...uploads.map((upload) => upload.url)];
      const nextMainImage = mainImage || nextImages[0];

      setImages(nextImages);
      setMainImage(nextMainImage);
      onChange("imageUrls", nextImages);
      onChange("image", nextMainImage);
    } catch (error) {
      console.error("Failed to compress or upload listing photos:", error);
      toast.error("Failed to prepare photos for upload. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) uploadImages(event.target.files);
    event.target.value = "";
  };

  const selectMainImage = (image: string) => {
    setMainImage(image);
    onChange("image", image);
  };

  const removeImage = (image: string) => {
    const nextImages = images.filter((currentImage) => currentImage !== image);
    const nextMainImage = mainImage === image ? nextImages[0] || "" : mainImage;

    setImages(nextImages);
    setMainImage(nextMainImage);
    onChange("imageUrls", nextImages);
    onChange("image", nextMainImage);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    uploadImages(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        isDragging && "rounded-md outline outline-2 outline-primary"
      )}
    >
      {images.map((image, index) => {
        const isMainImage = image === mainImage;

        return (
          <div
            key={image}
            className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
          >
            <Image
              fill
              src={image}
              alt={`Listing photo ${index + 1}`}
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => selectMainImage(image)}
              aria-label={isMainImage ? "Main photo" : "Set as main photo"}
              aria-pressed={isMainImage}
              title={isMainImage ? "Main photo" : "Set as main photo"}
              className={`absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow transition ${
                isMainImage
                  ? "bg-primary text-white"
                  : "bg-white text-neutral-600 hover:text-primary"
              }`}
            >
              <FaStar aria-hidden="true" />
            </button>
            {isMainImage && (
              <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                Main photo
              </span>
            )}
            <button
              type="button"
              onClick={() => removeImage(image)}
              aria-label={`Remove photo ${index + 1}`}
              title="Remove photo"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 shadow hover:bg-neutral-100"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        );
      })}

      {images.length < MAX_IMAGES && (
        <label
          htmlFor="listing-photos"
          className={cn(
            "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 text-neutral-600 transition hover:border-neutral-500 hover:bg-neutral-50",
            isLoading && "pointer-events-none opacity-70"
          )}
        >
          {isLoading ? (
            <SpinnerMini className="h-8 w-8 text-primary" />
          ) : (
            <>
              <TbPhotoPlus className="h-10 w-10" aria-hidden="true" />
              <span className="text-sm font-semibold">Add photos</span>
              <span className="text-xs text-neutral-500">
                {images.length} of {MAX_IMAGES}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            id="listing-photos"
            className="sr-only"
            onChange={handleChange}
            disabled={isLoading}
            multiple
          />
        </label>
      )}
    </div>
  );
};

export default ImageUpload;