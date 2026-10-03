"use client"

import React, { useEffect } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import marketIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { formatPrice, getPricePeriod, getPricePeriodLabel } from "@/utils/helper";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: marketIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

interface MapProps {
  center?: number[];
  listings?: MapListing[];
  onCoordinateSelect?: (coordinates: number[]) => void;
  showCenterMarker?: boolean;
}

export interface MapListing {
  id: string;
  title: string;
  imageSrc: string;
  price: number;
  pricePeriod?: string | null;
  priceType: string | null;
  country: string | null;
  region: string | null;
  latlng: number[];
}

const ALEXANDRIA_CENTER: L.LatLngExpression = [31.2001, 29.9187];
const CITY_ZOOM = 11;
const AREA_ZOOM = 14;
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const createListingIcon = (listing: MapListing) => {
  const imageSrc =
    listing.imageSrc.startsWith("https://") ||
    (listing.imageSrc.startsWith("/") && !listing.imageSrc.startsWith("//"))
      ? listing.imageSrc
      : "/images/placeholder.jpg";

  return L.divIcon({
    className: "apartment-map-marker-container",
    html: `<div class="apartment-map-marker"><img src="${escapeHtml(imageSrc)}" alt="" /><span>${escapeHtml(formatPrice(listing.price))}</span></div>`,
    iconSize: [132, 56],
    iconAnchor: [66, 56],
  });
};

const MapView = ({ center, listings }: MapProps) => {
  const map = useMap();

  useEffect(() => {
    if (listings?.length) {
      const bounds = L.latLngBounds(
        listings.map((listing) => listing.latlng as L.LatLngExpression)
      );
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: CITY_ZOOM });
      return;
    }

    map.setView(
      (center as L.LatLngExpression) || ALEXANDRIA_CENTER,
      center ? AREA_ZOOM : CITY_ZOOM
    );
  }, [center, listings, map]);

  return null;
};

const MapClickHandler = ({
  onCoordinateSelect,
}: Pick<MapProps, "onCoordinateSelect">) => {
  useMapEvents({
    click: ({ latlng }) =>
      onCoordinateSelect?.([latlng.lat, latlng.lng]),
  });

  return null;
};

const Map: React.FC<MapProps> = ({
  center,
  listings,
  onCoordinateSelect,
  showCenterMarker = true,
}) => {
  return (
    <MapContainer
      center={(center as L.LatLngExpression) || ALEXANDRIA_CENTER}
      zoom={center ? AREA_ZOOM : CITY_ZOOM}
      scrollWheelZoom={true}
      className={`h-full rounded-lg`}
    >
      <MapView center={center} listings={listings} />
          <MapClickHandler onCoordinateSelect={onCoordinateSelect} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listings?.length ? (
        <MarkerClusterGroup chunkedLoading>
          {listings.map((listing) => (
            <Marker
              key={listing.id}
              position={listing.latlng as L.LatLngExpression}
              icon={createListingIcon(listing)}
            >
              <Popup>
                <div className="flex min-w-44 flex-col gap-1 text-sm">
                  <span className="break-words font-semibold">
                    {listing.title}
                  </span>
                  <span className="text-neutral-500">
                    {listing.country}, {listing.region}
                  </span>
                  <span className="font-bold">
                    {formatPrice(listing.price)} /{" "}
                    {getPricePeriodLabel(
                      getPricePeriod(listing.pricePeriod, listing.priceType)
                    )}
                  </span>
                  <Link
                    href={`/listings/${listing.id}`}
                    className="mt-1 inline-flex min-h-11 items-center font-semibold text-primary underline"
                  >
                    View apartment
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      ) : center && showCenterMarker ? (
        <Marker position={center as L.LatLngExpression} />
      ) : null}
    </MapContainer>
  );
};

export default Map;