const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^['"]+|['"]+$/g, "");
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sampleListings = [
  {
    title: "Pacific View House",
    description: "A bright coastal home with an open terrace and views of the Pacific.",
    imageSrc: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85",
    category: "Villas",
    roomCount: 3,
    bathroomCount: 2,
    guestCount: 6,
    price: 285,
    country: "United States",
    region: "California",
    latlng: [34, -118],
  },
  {
    title: "Stone Terrace in Positano",
    description: "A quiet hillside stay with a sunlit terrace above the Amalfi Coast.",
    imageSrc: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1400&q=85",
    category: "Apartments",
    roomCount: 2,
    bathroomCount: 2,
    guestCount: 4,
    price: 340,
    country: "Italy",
    region: "Campania",
    latlng: [40, 14],
  },
  {
    title: "Kyoto Garden Machiya",
    description: "A restored wooden townhouse arranged around a peaceful private garden.",
    imageSrc: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85",
    category: "Studios",
    roomCount: 2,
    bathroomCount: 1,
    guestCount: 4,
    price: 165,
    country: "Japan",
    region: "Kyoto",
    latlng: [35, 136],
  },
  {
    title: "Ubud Poolside Retreat",
    description: "A leafy retreat with a private pool and an outdoor dining pavilion.",
    imageSrc: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85",
    category: "Villas",
    roomCount: 3,
    bathroomCount: 2,
    guestCount: 6,
    price: 210,
    country: "Indonesia",
    region: "Bali",
    latlng: [-8, 115],
  },
  {
    title: "Banff Alpine Cabin",
    description: "A timber cabin with mountain views, a fireplace, and nearby hiking trails.",
    imageSrc: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1400&q=85",
    category: "Chalets",
    roomCount: 2,
    bathroomCount: 1,
    guestCount: 4,
    price: 230,
    country: "Canada",
    region: "Alberta",
    latlng: [51, -115],
  },
];

async function main() {
  let host = await prisma.user.findUnique({
    where: { email: "sample-host@example.test" },
  });

  if (!host) {
    host = await prisma.user.create({
      data: {
        name: "Sample Host",
        email: "sample-host@example.test",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      },
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const listing of sampleListings) {
    const existing = await prisma.listing.findFirst({
      where: { userId: host.id, title: listing.title },
      select: { id: true, category: true },
    });

    if (existing) {
      if (existing.category !== listing.category) {
        await prisma.listing.update({
          where: { id: existing.id },
          data: { category: listing.category },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await prisma.listing.create({
      data: { ...listing, userId: host.id },
    });
    created += 1;
  }

  console.log(
    `Seed complete: ${created} listings created, ${updated} updated, ${skipped} unchanged.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed sample listings.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });