import { Router } from "express";

import {
  createCountry,
  getAllCountries,
  updateCountry,
  deleteCountry,
  createState,
  getAllStates,
  getStatesByCountry,
  updateState,
  deleteState,
  createCity,
  getAllCities,
  getCitiesByState,
  updateCity,
  deleteCity,
} from "../controllers/location.js";
import { upload } from "../middlewares/multer.js";

// import adminAuth from "../middlewares/adminAuth.js";

const router = Router();

/* ------------------------------------------------
   COUNTRY ROUTES
--------------------------------------------------- */

router.post("/countries", upload.single("image"), createCountry); // tested
router.get("/countries", getAllCountries); // tested
router.put("/countries/:id", upload.single("image"), updateCountry); // tested
router.delete("/countries/:id", deleteCountry); // tested

/* ------------------------------------------------
   STATE ROUTES
--------------------------------------------------- */

router.post("/states", upload.single("image"), createState); // tested
router.get("/states", getAllStates); // tested
router.get("/states/by-country/:countryId", getStatesByCountry); // tested
router.put("/states/:id", upload.single("image"), updateState); // tested
router.delete("/states/:id", deleteState); // tested

/* ------------------------------------------------
   CITY ROUTES
--------------------------------------------------- */

router.post("/cities", upload.single("image"), createCity); //tested
router.get("/cities", getAllCities); // tested
router.get("/cities/by-state/:stateId", getCitiesByState); // tested
router.put("/cities/:id", upload.single("image"), updateCity); // tested
router.delete("/cities/:id", deleteCity); // tested

export default router;
