import {
  MdApartment,
  MdCabin,
  MdOutlineBedroomParent,
  MdVilla,
} from "react-icons/md";

export const categories = [
  {
    label: "Apartments",
    icon: MdApartment,
    description: "Comfortable homes in apartment buildings.",
  },
  {
    label: "Villas",
    icon: MdVilla,
    description: "Private homes with room to relax.",
  },
  {
    label: "Chalets",
    icon: MdCabin,
    description: "Cozy mountain lodges and cabins.",
  },
  {
    label: "Studios",
    icon: MdOutlineBedroomParent,
    description: "Compact, open-plan places to stay.",
  },
];

export const LISTINGS_BATCH = 16;

export const menuItems = [
  {
    label: "My trips",
    path: "/trips",
  },
  {
    label: "My favorites",
    path: "/favorites",
  },
  {
    label: "My reservations",
    path: "/reservations",
  },
  {
    label: "My properties",
    path: "/properties",
  },
];
