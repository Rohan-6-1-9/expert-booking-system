const Expert = require("../models/Expert");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

// ─────────────────────────────────────
// GET /experts
// ─────────────────────────────────────
const getAllExperts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minRating,
    sortBy,
    minPrice,
    maxPrice,
    page = 1,
    limit = 9,
  } = req.query;

  const filter = { isActive: true };

  if (search) {
    filter.name = {
      $regex: search,
      $options: "i",
    };
  }

  if (category) {
    filter.domain = {
      $regex: category,
      $options: "i",
    };
  }

  if (minRating) {
    filter.rating = {
      $gte: parseFloat(minRating),
    };
  }

  if (minPrice || maxPrice) {
    filter.sessionRate = {};

    if (minPrice) {
      filter.sessionRate.$gte = parseFloat(minPrice);
    }

    if (maxPrice) {
      filter.sessionRate.$lte = parseFloat(maxPrice);
    }
  }

  let sortOption = {};

  switch (sortBy) {
    case "top-rated":
      sortOption = { rating: -1 };
      break;

    case "price-low":
      sortOption = { sessionRate: 1 };
      break;

    case "price-high":
      sortOption = { sessionRate: -1 };
      break;

    case "newest":
      sortOption = { createdAt: -1 };
      break;

    default:
      sortOption = { rating: -1 };
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const skip = (pageNum - 1) * limitNum;

  const total = await Expert.countDocuments(filter);

  const experts = await Expert.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum)
    .select("-__v")
    .lean({ virtuals: true });

  const enriched = experts.map((e) => ({
    ...e,
    freeSlotCount: e.availableSlots.filter(
      (s) => !s.isBooked
    ).length,
  }));

  res.status(200).json({
    success: true,
    count: enriched.length,
    total,
    pagination: {
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
      limit: limitNum,
    },
    data: enriched,
  });
});

// ─────────────────────────────────────
// GET /experts/:id
// ─────────────────────────────────────
const getExpertById = asyncHandler(async (req, res) => {
  const expert = await Expert.findById(req.params.id)
    .select("-__v");

  if (!expert) {
    throw new AppError(
      `Expert not found with id: ${req.params.id}`,
      404
    );
  }

  res.status(200).json({
    success: true,
    data: expert,
  });
});

// ─────────────────────────────────────
// GET /experts/:id/slots
// ─────────────────────────────────────
const getExpertSlots = asyncHandler(async (req, res) => {
  const expert = await Expert.findById(req.params.id);

  if (!expert) {
    throw new AppError("Expert not found", 404);
  }

  const { date } = req.query;

  let slots = expert.availableSlots || [];

  if (date) {
    slots = slots.filter(
      (slot) => slot.date === date
    );
  }

  const formattedSlots = slots.map((slot) => ({
    ...slot.toObject(),
    isBooked:
      slot.isBooked === true ||
      slot.status === "booked",
  }));

  res.status(200).json({
    success: true,
    slots: formattedSlots,
  });
});

module.exports = {
  getAllExperts,
  getExpertById,
  getExpertSlots,
};