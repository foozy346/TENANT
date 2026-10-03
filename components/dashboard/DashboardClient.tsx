"use client";

import Image from "next/image";
import Link from "next/link";
import React, { FormEvent, useMemo, useState } from "react";
import { format } from "date-fns";
import { Listing, Reservation } from "@prisma/client";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiHome,
  FiList,
  FiPlus,
  FiUser,
  FiX,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import ConfirmDelete from "@/components/ConfirmDelete";
import Heading from "@/components/Heading";
import ImageCard from "@/components/Image";
import ListingCard from "@/components/ListingCard";
import Modal from "@/components/modals/Modal";
import RentModal from "@/components/modals/RentModal";
import { useEdgeStore } from "@/lib/edgestore";
import { updateFavorite } from "@/services/favorite";
import {
  cancelOwnBooking,
  deleteOwnedListing,
  respondToReservation,
  setListingHidden,
  setListingStatus,
  updateProfile,
} from "@/services/dashboard";
import { formatPrice, getListingStatusLabel, getPricePeriod, getPricePeriodLabel } from "@/utils/helper";

type DashboardData = Awaited<
  ReturnType<typeof import("@/services/dashboard").getDashboardData>
>;
type DashboardListing = DashboardData["listings"][number];
type DashboardBooking = DashboardData["bookings"][number];

type Section = "overview" | "bookings" | "favorites" | "listings" | "requests" | "profile";

const tenantTabs: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: FiHome },
  { id: "bookings", label: "Bookings", icon: FiCalendar },
  { id: "favorites", label: "Saved", icon: FiHeart },
  { id: "profile", label: "Profile", icon: FiUser },
];

const hostTabs: typeof tenantTabs = [
  ...tenantTabs.slice(0, 3),
  { id: "listings", label: "Listings", icon: FiList },
  { id: "requests", label: "Requests", icon: FiClock },
  tenantTabs[3],
];

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  accepted: "bg-emerald-50 text-emerald-800",
  rejected: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-neutral-100 text-neutral-600",
  available: "bg-emerald-50 text-emerald-800",
  reserved: "bg-amber-50 text-amber-800",
  rented: "bg-blue-50 text-blue-800",
  hidden: "bg-neutral-100 text-neutral-600",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold capitalize ${
      statusTone[status] ?? "bg-neutral-100 text-neutral-600"
    }`}
  >
    {status}
  </span>
);

const listingStatus = (listing: DashboardListing, now: Date) => {
  if (listing.isHidden) return "hidden";
  if (listing.status === "rented") return "rented";
  if (
    listing.status === "reserved" ||
    listing.reservations.some(
      (reservation) =>
        reservation.status === "accepted" && reservation.endDate > now
    )
  ) {
    return "reserved";
  }
  return "available";
};

const dateRange = (startDate: Date, endDate: Date) =>
  `${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}`;

const DashboardClient = ({ data }: { data: DashboardData }) => {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { edgestore } = useEdgeStore();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [editingListing, setEditingListing] = useState<DashboardListing | null>(null);
  const [deletingListing, setDeletingListing] = useState<DashboardListing | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [profileName, setProfileName] = useState(data.user.name ?? "");
  const [profilePhone, setProfilePhone] = useState(data.user.phone ?? "");
  const [profileImage, setProfileImage] = useState(data.user.image ?? "");
  const now = useMemo(() => new Date(), []);
  const tabs = data.hasListings ? hostTabs : tenantTabs;

  const bookings = data.bookings;
  const receivedRequests = data.listings.flatMap((listing) =>
    listing.reservations.map((reservation) => ({ listing, reservation }))
  );
  const pendingRequests = receivedRequests.filter(
    ({ reservation }) => reservation.status === "pending"
  );
  const upcomingBookings = bookings.filter(
    (booking) =>
      (booking.status === "pending" || booking.status === "accepted") &&
      booking.endDate > now
  );
  const acceptedIncome = receivedRequests
    .filter(({ reservation }) => reservation.status === "accepted")
    .reduce((total, { reservation }) => total + reservation.totalPrice, 0);

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return [...data.listings]
      .filter((listing) => {
        const status = listingStatus(listing, now);
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        const matchesSearch =
          !normalizedSearch ||
          `${listing.title} ${listing.region ?? ""} ${listing.country ?? ""} ${listing.category}`
            .toLocaleLowerCase()
            .includes(normalizedSearch);
        return matchesStatus && matchesSearch;
      })
      .sort((left, right) =>
        sortBy === "price"
          ? left.price - right.price
          : right.createdAt.getTime() - left.createdAt.getTime()
      );
  }, [data.listings, now, search, sortBy, statusFilter]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setIsWorking(true);
    try {
      await action();
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      async () => {
        await updateProfile({ name: profileName, phone: profilePhone, image: profileImage || null });
        await updateSession();
      },
      "Profile saved."
    );
  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsWorking(true);
    try {
      const uploaded = await edgestore.publicFiles.upload({ file });
      setProfileImage(uploaded.url);
      toast.success("Photo uploaded. Save your profile to apply it.");
    } catch {
      toast.error("Could not upload the profile photo.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteListing = async (close?: () => void) => {
    if (!deletingListing) return;
    setIsWorking(true);
    try {
      await deleteOwnedListing(deletingListing.id);
      toast.success("Listing deleted.");
      close?.();
      setDeletingListing(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete listing.");
    } finally {
      setIsWorking(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold text-primary">TENANT DASHBOARD</p>
        <h2 className="mt-1 break-words text-2xl font-bold text-neutral-950 sm:text-3xl">
          Welcome{data.user.name ? `, ${data.user.name.split(" ")[0]}` : " back"}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Your stays and saved places, together.</p>
      </section>

      <div className={`grid grid-cols-2 gap-3 ${data.hasListings ? "xl:grid-cols-4" : ""}`}>
        <StatCard label="Upcoming bookings" value={String(upcomingBookings.length)} icon={FiCalendar} />
        <StatCard label="Saved places" value={String(data.favorites.length)} icon={FiHeart} />
        {data.hasListings && (
          <>
            <StatCard label="Active listings" value={String(data.listings.filter((listing) => !listing.isHidden && listing.status !== "rented").length)} icon={FiHome} />
            <StatCard label="Pending requests" value={String(pendingRequests.length)} icon={FiClock} />
            <StatCard label="Accepted income" value={formatPrice(acceptedIncome)} icon={FiCheck} />
          </>
        )}
      </div>

      {!data.hasListings && (
        <section className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-neutral-950">Become a host</h3>
            <p className="mt-1 max-w-xl text-sm text-neutral-600">
              Share your place with guests visiting Alexandria.
            </p>
          </div>
          <Modal.Trigger name="share">
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gradient px-4 text-sm font-semibold text-white sm:w-auto">
              <FiPlus aria-hidden="true" /> Add a listing
            </button>
          </Modal.Trigger>
        </section>
      )}

      {upcomingBookings.length > 0 && (
        <section className="space-y-3">
          <SectionTitle title="Coming up" action="See bookings" onAction={() => setSection("bookings")} />
          {upcomingBookings.slice(0, 2).map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </section>
      )}
    </div>
  );

  const renderBookings = () => (
    <section className="space-y-4">
      <SectionTitle title="My bookings" subtitle="Trips you’ve reserved." />
      {bookings.length ? bookings.map((booking) => (
        <BookingRow
          key={booking.id}
          booking={booking}
          canCancel={booking.status === "pending" || (booking.status === "accepted" && booking.startDate > now)}
          onCancel={() => {
            if (window.confirm("Cancel this booking?")) {
              void runAction(() => cancelOwnBooking(booking.id), "Booking cancelled.");
            }
          }}
          isWorking={isWorking}
        />
      )) : <EmptySection title="No bookings yet" detail="Places you reserve will show up here." />}
    </section>
  );

  const renderFavorites = () => (
    <section className="space-y-4">
      <SectionTitle title="Favorites" subtitle="The places you’ve saved." />
      {data.favorites.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.favorites.map((listing) => (
            <ListingCard key={listing.id} data={listing} hasFavorited />
          ))}
        </div>
      ) : <EmptySection title="No saved places" detail="Tap the heart on a listing to save it here." />}
    </section>
  );

  const renderListings = () => (
    <section className="space-y-4">
      <SectionTitle
        title="My listings"
        subtitle={`${data.listings.length} ${data.listings.length === 1 ? "place" : "places"} you host.`}
      />
      <Modal.Trigger name="share">
        <button type="button" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gradient px-4 text-sm font-semibold text-white sm:w-auto">
          <FiPlus aria-hidden="true" /> Add new listing
        </button>
      </Modal.Trigger>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search your listings"
          aria-label="Search your listings"
          className="h-11 min-w-0 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-primary"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter listing status"
          className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-base"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="rented">Rented</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          aria-label="Sort listings"
          className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-base"
        >
          <option value="newest">Newest</option>
          <option value="price">Price: low to high</option>
        </select>
      </div>

      {filteredListings.length ? (
        <div className="space-y-3">
          {filteredListings.map((listing) => (
            <HostListingRow
              key={listing.id}
              listing={listing}
              status={listingStatus(listing, now)}
              isWorking={isWorking}
              onEdit={() => setEditingListing(listing)}
              onHide={() => void runAction(() => setListingHidden(listing.id, !listing.isHidden), listing.isHidden ? "Listing is visible." : "Listing hidden.")}
              onStatusChange={(status) => void runAction(() => setListingStatus(listing.id, status), "Listing status updated.")}
              onDelete={() => setDeletingListing(listing)}
            />
          ))}
        </div>
      ) : <EmptySection title="No matching listings" detail="Change the search or filters to see your places." />}
    </section>
  );

  const renderRequests = () => (
    <section className="space-y-4">
      <SectionTitle title="Requests" subtitle="Bookings guests have requested for your listings." />
      {receivedRequests.length ? receivedRequests.map(({ listing, reservation }) => (
        <RequestRow
          key={reservation.id}
          listing={listing}
          reservation={reservation}
          isWorking={isWorking}
          onRespond={(status) => {
            const verb = status === "accepted" ? "Accept" : "Reject";
            if (window.confirm(`${verb} this booking request?`)) {
              void runAction(() => respondToReservation(reservation.id, status), `Request ${status}.`);
            }
          }}
        />
      )) : <EmptySection title="No requests yet" detail="Guest booking requests will appear here." />}
    </section>
  );

  const renderProfile = () => (
    <section className="max-w-2xl space-y-5">
      <SectionTitle title="Profile" subtitle="Keep your account details current." />
      <form onSubmit={handleProfileSubmit} className="space-y-5 rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar src={profileImage} />
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50">
            Change photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isWorking}
              onChange={(event) => {
                void handleProfilePhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Name</span>
          <input value={profileName} onChange={(event) => setProfileName(event.target.value)} required maxLength={80} className="h-11 w-full rounded-md border border-neutral-300 px-3 text-base focus:border-primary focus:outline-none" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Phone</span>
          <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} maxLength={32} type="tel" className="h-11 w-full rounded-md border border-neutral-300 px-3 text-base focus:border-primary focus:outline-none" />
        </label>
        <p className="break-all text-sm text-neutral-500">{data.user.email}</p>
        <Button type="submit" disabled={isWorking} className="h-11 max-w-xs">
          {isWorking ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </section>
  );

  const renderSection = () => {
    switch (section) {
      case "bookings": return renderBookings();
      case "favorites": return renderFavorites();
      case "listings": return renderListings();
      case "requests": return renderRequests();
      case "profile": return renderProfile();
      default: return renderOverview();
    }
  };

  const renderTab = (tab: (typeof tenantTabs)[number], mobile = false) => {
    const Icon = tab.icon;
    const selected = section === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        aria-current={selected ? "page" : undefined}
        onClick={() => setSection(tab.id)}
        className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
          selected ? "bg-primary/10 text-primary" : "text-neutral-600 hover:bg-neutral-100"
        } ${mobile ? "min-w-0 flex-1 flex-col justify-center gap-1 px-1 text-[11px]" : "w-full"}`}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{tab.label}</span>
      </button>
    );
  };

  return (
    <Modal>
      <div className="main-container min-h-[calc(100dvh-6rem)] pb-24 pt-3 md:pb-8 md:pt-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">TENANT</p>
            <h1 className="break-words text-2xl font-bold text-neutral-950 sm:text-3xl">Dashboard</h1>
          </div>
          <Link href="/" aria-label="Back to home" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50">
            <FiHome aria-hidden="true" />
          </Link>
        </div>
        <div className="grid min-w-0 gap-6 md:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <nav aria-label="Dashboard sections" className="sticky top-28 space-y-1 border-e border-neutral-200 pe-4">
              {tabs.map((tab) => renderTab(tab))}
            </nav>
          </aside>
          <div className="min-w-0">{renderSection()}</div>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white/95 px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
        {tabs.map((tab) => renderTab(tab, true))}
      </nav>

      <Modal.Window name="share">
        <RentModal onSaved={() => router.refresh()} />
      </Modal.Window>
      <Modal.Window name="edit-listing" dismissOnOutside={false} dismissOnEscape={false}>
        {editingListing ? (
          <RentModal
            listing={editingListing}
            mode="edit"
            onSaved={() => {
              setEditingListing(null);
              router.refresh();
            }}
          />
        ) : <div />}
      </Modal.Window>
      <Modal.Window name="delete-listing">
        <ConfirmDelete
          title="Delete listing"
          isLoading={isWorking}
          onConfirm={(close) => void handleDeleteListing(close)}
        />
      </Modal.Window>
    </Modal>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-4">
    <Icon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
    <p className="break-words text-xl font-bold text-neutral-950 sm:text-2xl">{value}</p>
    <p className="mt-1 text-xs text-neutral-500 sm:text-sm">{label}</p>
  </div>
);

const SectionTitle = ({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="break-words text-xl font-bold text-neutral-950">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
    </div>
    {action && onAction && (
      <button type="button" onClick={onAction} className="min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/5">
        {action}
      </button>
    )}
  </div>
);

const EmptySection = ({ title, detail }: { title: string; detail: string }) => (
  <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center">
    <h3 className="font-semibold text-neutral-900">{title}</h3>
    <p className="mt-1 text-sm text-neutral-500">{detail}</p>
  </div>
);

const BookingRow = ({
  booking,
  canCancel = false,
  onCancel,
  isWorking = false,
}: {
  booking: DashboardBooking;
  canCancel?: boolean;
  onCancel?: () => void;
  isWorking?: boolean;
}) => (
  <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
    <Link href={`/listings/${booking.listingId}`} className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:aspect-square sm:h-24 sm:w-24">
      <ImageCard imageSrc={booking.listing.imageSrc} alt={booking.listing.title} fill className="object-cover" sizes="96px" />
    </Link>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/listings/${booking.listingId}`} className="break-words font-semibold text-neutral-950 hover:underline">{booking.listing.title}</Link>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-1 break-words text-sm text-neutral-500">{booking.listing.region}, {booking.listing.country}</p>
      <p className="mt-1 text-sm text-neutral-600">{dateRange(booking.startDate, booking.endDate)}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{formatPrice(booking.totalPrice)}</p>
    </div>
    {canCancel && onCancel && (
      <Button type="button" outline disabled={isWorking} onClick={onCancel} className="min-h-11 w-full shrink-0 sm:w-auto">
        Cancel booking
      </Button>
    )}
  </article>
);

const HostListingRow = ({
  listing,
  status,
  isWorking,
  onEdit,
  onHide,
  onStatusChange,
  onDelete,
}: {
  listing: DashboardListing;
  status: string;
  isWorking: boolean;
  onEdit: () => void;
  onHide: () => void;
  onStatusChange: (status: "available" | "rented") => void;
  onDelete: () => void;
}) => {
  const pendingCount = listing.reservations.filter((reservation) => reservation.status === "pending").length;
  const nextReservation = listing.reservations
    .filter((reservation) => (reservation.status === "accepted" || reservation.status === null) && reservation.endDate > new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  const period = getPricePeriod(listing.pricePeriod, listing.priceType);

  return (
    <article className="grid min-w-0 gap-3 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4 sm:p-4">
      <Link href={`/listings/${listing.id}`} className="relative aspect-[16/9] overflow-hidden rounded-md bg-neutral-100 sm:aspect-square sm:h-24">
        <ImageCard imageSrc={listing.imageSrc} alt={listing.title} fill className="object-cover" sizes="96px" />
      </Link>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/listings/${listing.id}`} className="break-words font-semibold text-neutral-950 hover:underline">{listing.title}</Link>
            <p className="break-words text-sm text-neutral-500">{listing.region}, {listing.country} · {listing.category}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm font-semibold text-neutral-900">
          {formatPrice(listing.price)} / {getPricePeriodLabel(period)}
          {listing.depositAmount ? <span className="font-normal text-neutral-500"> · {formatPrice(listing.depositAmount)} deposit</span> : null}
        </p>
        <p className="text-xs text-neutral-500">
          {listing.reservations.length} bookings · {pendingCount} pending
          {nextReservation ? ` · Next ${format(nextReservation.startDate, "MMM d")}` : " · No upcoming bookings"}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Modal.Trigger name="edit-listing">
            <button type="button" onClick={onEdit} disabled={isWorking} className="min-h-11 rounded-md border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50">Edit</button>
          </Modal.Trigger>
          <button type="button" onClick={onHide} disabled={isWorking} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50">
            {listing.isHidden ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
            {listing.isHidden ? "Show" : "Hide"}
          </button>
          <select
            aria-label={`Set status for ${listing.title}`}
            value={listing.status === "rented" ? "rented" : "available"}
            onChange={(event) => onStatusChange(event.target.value as "available" | "rented")}
            disabled={isWorking || listing.isHidden}
            className="h-11 min-w-32 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="available">Available</option>
            <option value="rented">Rented</option>
          </select>
          <Link href={`/listings/${listing.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/5">
            <FiEye aria-hidden="true" /> View
          </Link>
          <Modal.Trigger name="delete-listing">
            <button type="button" onClick={onDelete} disabled={isWorking} className="min-h-11 rounded-md px-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">Delete</button>
          </Modal.Trigger>
        </div>
      </div>
    </article>
  );
};

const RequestRow = ({
  listing,
  reservation,
  isWorking,
  onRespond,
}: {
  listing: DashboardListing;
  reservation: DashboardListing["reservations"][number];
  isWorking: boolean;
  onRespond: (status: "accepted" | "rejected") => void;
}) => (
  <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      <Avatar src={reservation.user.image} />
      <div className="min-w-0">
        <p className="break-words font-semibold text-neutral-950">{reservation.user.name || reservation.user.email || "Guest"}</p>
        <Link href={`/listings/${listing.id}`} className="break-words text-sm text-primary hover:underline">{listing.title}</Link>
        <p className="mt-1 text-sm text-neutral-500">{dateRange(reservation.startDate, reservation.endDate)} · {formatPrice(reservation.totalPrice)}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={reservation.status} />
      {reservation.status === "pending" && (
        <>
          <button type="button" onClick={() => onRespond("accepted")} disabled={isWorking} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:opacity-90"><FiCheck /> Accept</button>
          <button type="button" onClick={() => onRespond("rejected")} disabled={isWorking} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50"><FiX /> Reject</button>
        </>
      )}
    </div>
  </article>
);

export default DashboardClient;