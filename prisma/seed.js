const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^['"]+|['"]+$/g, "");
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const areas = require("../data/countries.json");
const photos = [
  "photo-1522708323590-d24dbb6b0267",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1494526585095-c41746248156",
  "photo-1505693416388-ac5ce068fe85",
  "photo-1484154218962-a197022b5858",
  "photo-1493809842364-78817add7ffb",
];
const titleStyles = ["Sunny", "Sea-view", "Modern", "Bright", "Corniche", "Cozy"];
const descriptionStyles = [
  "A welcoming apartment with a bright living area and a practical kitchen.",
  "A comfortable city stay with a furnished balcony and easy local access.",
  "A recently refreshed home with airy rooms and thoughtful essentials.",
  "A relaxed coastal base with comfortable furnishings and plenty of daylight.",
  "A well-kept apartment near neighborhood cafes, shops, and the waterfront.",
];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomInteger = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const sampleListings = areas.map((area) => ({
  title: `${randomItem(titleStyles)} Apartment in ${area.label}`,
  description: randomItem(descriptionStyles),
  imageSrc: `https://images.unsplash.com/${randomItem(photos)}?auto=format&fit=crop&w=1400&q=85`,
  category: "Apartments",
  roomCount: randomInteger(1, 4),
  bathroomCount: randomInteger(1, 3),
  guestCount: randomInteger(2, 8),
  price: randomInteger(1500, 12000),
  country: area.label,
  region: area.region,
  latlng: area.latlng,
}));

async function main() {
  const resetDatabase = process.argv.includes("--reset");
  const updateDemoPrices = process.argv.includes("--update-demo-prices");

  if (!resetDatabase && !updateDemoPrices) {
    throw new Error(
      "Choose --reset to replace all application data, or --update-demo-prices to update only the Alexandria demo listings."
    );
  }

  await prisma.$connect();

  if (updateDemoPrices) {
    const host = await prisma.user.findUnique({
      where: { email: "alexandria-host@example.test" },
    });

    if (!host) {
      throw new Error("Alexandria demo host was not found; no prices were changed.");
    }

    let updated = 0;

    for (const area of areas) {
      const listing = await prisma.listing.findFirst({
        where: {
          userId: host.id,
          category: "Apartments",
          country: area.label,
        },
        select: { id: true },
      });

      if (listing) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { price: randomInteger(1500, 12000) },
        });
        updated += 1;
      }
    }

    console.log(`Updated ${updated} Alexandria demo listing prices to EGP.`);
    return;
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const removed = {
        reservations: await transaction.reservation.count(),
        accounts: await transaction.account.count(),
        listings: await transaction.listing.count(),
        users: await transaction.user.count(),
      };

      await transaction.reservation.deleteMany();
      await transaction.account.deleteMany();
      await transaction.listing.deleteMany();
      await transaction.user.deleteMany();

      const host = await transaction.user.create({
        data: {
          name: "Alexandria Sample Host",
          email: "alexandria-host@example.test",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
        },
      });

      for (const listing of sampleListings) {
        await transaction.listing.create({
          data: { ...listing, userId: host.id },
        });
      }

      return removed;
    },
    { maxWait: 15000, timeout: 120000 }
  );

  console.log(
    `Reset complete for TENANT: removed ${result.users} users, ${result.accounts} accounts, ${result.listings} listings, and ${result.reservations} reservations; created 1 sample host and ${sampleListings.length} Alexandria apartments.`
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