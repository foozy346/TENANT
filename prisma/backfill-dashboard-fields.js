const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const validPeriods = new Set(["nightly", "weekly", "monthly"]);

const backfillDashboardFields = async () => {
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      pricePeriod: true,
      priceType: true,
      depositAmount: true,
      furnished: true,
      status: true,
      isHidden: true,
    },
  });

  let updatedListings = 0;
  for (const listing of listings) {
    const data = {};
    if (listing.pricePeriod == null) {
      data.pricePeriod = validPeriods.has(listing.priceType)
        ? listing.priceType
        : "nightly";
    }
    if (listing.depositAmount == null) data.depositAmount = 0;
    if (listing.furnished == null) data.furnished = false;
    if (listing.status == null) data.status = "available";
    if (listing.isHidden == null) data.isHidden = false;

    if (Object.keys(data).length) {
      await prisma.listing.update({ where: { id: listing.id }, data });
      updatedListings += 1;
    }
  }

  const legacyReservations = await prisma.reservation.findMany({
    where: { status: null },
    select: { id: true },
  });

  for (const reservation of legacyReservations) {
    await prisma.reservation.updateMany({
      where: { id: reservation.id, status: null },
      data: { status: "accepted" },
    });
  }

  console.log(
    `Backfilled ${updatedListings} listings and ${legacyReservations.length} reservations.`
  );
};

backfillDashboardFields()
  .catch((error) => {
    console.error("Dashboard data backfill failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());