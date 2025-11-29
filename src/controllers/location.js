import Country from "../models/Country.js";
import State from "../models/State.js";
import City from "../models/City.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import SuccessResponse from "../utils/SuccessResponse.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";

/* -------------------------------------------------------
   COUNTRY CRUD
------------------------------------------------------- */

// Create Country
export const createCountry = asyncHandler(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new ErrorResponse(400, "Name is required"));
  }

  const exists = await Country.findOne({ name: name.toLowerCase() });
  if (exists) {
    return next(new ErrorResponse(400, `Country '${name}' already exists`));
  }

  if (!req.file) {
    return next(new ErrorResponse(400, "Country image is required"));
  }

  const image = await uploadToCloudinary([req.file]);
  req.body.image = image[0];

  const country = await Country.create(req.body);

  return res
    .status(201)
    .json(
      new SuccessResponse(201, `'${country.name}' Country created`, country)
    );
});

// Get All Countries
export const getAllCountries = asyncHandler(async (req, res) => {
  const countries = await Country.find().sort({ name: 1 });

  return res
    .status(200)
    .json(new SuccessResponse(200, "All countries", countries));
});

// Update Country
export const updateCountry = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const country = await Country.findById(id);
  if (!country) return next(new ErrorResponse(404, "Country not found"));

  console.log(req.body.name);
  if (req.body?.name) {
    const exists = await Country.findOne({
      name: req.body.name.toLowerCase(),
      _id: { $ne: id },
    });
    if (exists) {
      return next(
        new ErrorResponse(400, `Country '${req.body.name}' already exists`)
      );
    }
  }

  if (req.file) {
    const image = await uploadToCloudinary([req.file]);
    if (image.length > 0) {
      req.body.image = image[0];
      await deleteFromCloudinary([country.image]);
    }
  }

  const updated = await Country.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new SuccessResponse(200, `'${updated.name}' Country updated`, updated)
    );
});

// Delete Country
export const deleteCountry = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const country = await Country.findById(id);
  if (!country) return next(new ErrorResponse(404, "Country not found"));

  // prevent delete if states exist
  const stateExists = await State.findOne({ country: id });
  if (stateExists) {
    return next(
      new ErrorResponse(400, "Cannot delete country with existing states")
    );
  }

  await deleteFromCloudinary([country.image]);
  await country.deleteOne();

  return res
    .status(200)
    .json(new SuccessResponse(200, `Country '${country.name}' deleted`));
});

/* -------------------------------------------------------
   STATE CRUD
------------------------------------------------------- */

// Create State
export const createState = asyncHandler(async (req, res, next) => {
  const { name, country } = req.body;

  if (!name || !country) {
    return next(new ErrorResponse(400, "Name and country are required"));
  }

  const countryExists = await Country.findById(country);
  if (!countryExists) {
    return next(new ErrorResponse(404, "Country not found"));
  }

  const exists = await State.findOne({
    name: name.toLowerCase(),
    country,
  });

  if (exists) {
    return next(
      new ErrorResponse(
        400,
        `State '${name}' already exists in '${countryExists.name}'`
      )
    );
  }

  if (!req.file) {
    return next(new ErrorResponse(400, "State image is required"));
  }

  const image = await uploadToCloudinary([req.file]);
  req.body.image = image[0];

  const state = await State.create(req.body);
  await state.populate("country", "name");

  return res
    .status(201)
    .json(
      new SuccessResponse(
        201,
        `State '${state.name}' created in '${countryExists.name}'`,
        state
      )
    );
});

// Get All States
export const getAllStates = asyncHandler(async (req, res) => {
  const states = await State.find()
    .populate("country", "name")
    .sort({ name: 1 });

  return res.status(200).json(new SuccessResponse(200, "All states", states));
});

// Get States by Country
export const getStatesByCountry = asyncHandler(async (req, res, next) => {
  const { countryId } = req.params;

  const country = await Country.findById(countryId);
  if (!country) return next(new ErrorResponse(404, "Country not found"));

  const states = await State.find({ country: countryId }).sort({ name: 1 });

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `States fetched by Country '${country.name}'`,
        states
      )
    );
});

// Update State
export const updateState = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const state = await State.findById(id);
  if (!state) return next(new ErrorResponse(404, "State not found"));

  if (req.body.name) {
    const stateExists = await State.findOne({ name: req.body.name });
    if (stateExists) {
      return next(
        new ErrorResponse(
          400,
          `State '${stateExists.name}' already exists in '${state.country}'`
        )
      );
    }
  }

  if (req.file) {
    const image = await uploadToCloudinary([req.file]);
    if (image.length > 0) {
      req.body.image = image[0];
      await deleteFromCloudinary([state.image]);
    }
  }

  const updated = await State.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  return res
    .status(200)
    .json(new SuccessResponse(200, `State '${updated.name}' updated`, updated));
});

// Delete State
export const deleteState = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const state = await State.findById(id);
  if (!state) return next(new ErrorResponse(404, "State not found"));

  // prevent delete if cities exist
  const cityExists = await City.findOne({ state: id });
  if (cityExists) {
    return next(
      new ErrorResponse(400, "Cannot delete state with existing cities")
    );
  }

  await deleteFromCloudinary([state.image]);
  await state.deleteOne();

  return res
    .status(200)
    .json(new SuccessResponse(200, `'${state.name}' State deleted`));
});

/* -------------------------------------------------------
   CITY CRUD
------------------------------------------------------- */

// Create City
export const createCity = asyncHandler(async (req, res, next) => {
  const { name, state } = req.body;

  if (!name || !state) {
    return next(new ErrorResponse(400, "Name and state are required"));
  }

  const stateExists = await State.findById(state);
  if (!stateExists) {
    return next(new ErrorResponse(404, "State not found"));
  }

  const exists = await City.findOne({
    name: name.toLowerCase(),
    state,
  });

  if (exists) {
    return next(
      new ErrorResponse(
        400,
        `City '${name}' already exists in ${stateExists.name}`
      )
    );
  }

  if (!req.file) {
    return next(new ErrorResponse(400, "State image is required"));
  }

  const image = await uploadToCloudinary([req.file]);
  req.body.image = image[0];

  const city = await City.create(req.body);

  return res
    .status(201)
    .json(
      new SuccessResponse(
        201,
        `City '${name}' created in '${stateExists.name}'`,
        city
      )
    );
});

// Get All Cities
export const getAllCities = asyncHandler(async (req, res) => {
  const cities = await City.find()
    .populate({
      path: "state",
      populate: {
        path: "country",
        select: "name",
      },
      select: "name country",
    })
    .sort({ name: 1 });

  return res.status(200).json(new SuccessResponse(200, "All cities", cities));
});

// Get Cities by State
export const getCitiesByState = asyncHandler(async (req, res, next) => {
  const { stateId } = req.params;

  const state = await State.findById(stateId);
  if (!state) return next(new ErrorResponse(404, "State not found"));

  const cities = await City.find({ state: stateId }).sort({ name: 1 });

  return res
    .status(200)
    .json(
      new SuccessResponse(
        200,
        `Cities fetched by state '${state.name}'`,
        cities
      )
    );
});

// Update City
export const updateCity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const city = await City.findById(id);
  if (!city) return next(new ErrorResponse(404, "City not found"));

  if (req.body.name) {
    const cityExists = await City.findOne({ name: req.body.name });
    if (cityExists) {
      return next(
        new ErrorResponse(
          400,
          `City '${req.body.name}' already exists in '${city.state}'`
        )
      );
    }
  }

  if (req.file) {
    const image = await uploadToCloudinary([req.file]);
    if (image.length > 0) {
      req.body.image = image[0];
      await deleteFromCloudinary([city.image]);
    }
  }

  const updated = await City.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  return res
    .status(200)
    .json(new SuccessResponse(200, `City '${updated.name}' updated`, updated));
});

// Delete City
export const deleteCity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const city = await City.findById(id);
  if (!city) return next(new ErrorResponse(404, "City not found"));

  await deleteFromCloudinary([city.image]);
  await city.deleteOne();

  return res
    .status(200)
    .json(new SuccessResponse(200, `City '${city.name}' deleted`));
});
