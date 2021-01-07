const express = require("express");
const { check, validationResult } = require("express-validator");
const { getPlaces, writePlaces } = require("../../utilites");
const uniqid = require("uniqid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../../cloudinary");
const moment = require("moment");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "airBnb/Places",
  },
});

const cloudinaryMulter = multer({ storage: storage });

const placesRouter = express.Router();

placesRouter.get("/", async (req, res, next) => {
  try {
    const all = await getPlaces();
    if (req.query === null) res.send(places);
    else {
      let places = all;
      places = req.query.city && places.filter((place) => place.address.city.includes(req.query.city));
      places = req.query.title && places.filter((place) => place.title.includes(req.params.title));
      places = req.query.priceMax && places.filter((place) => place.price <= req.params.priceMax);
      places = req.query.priceMin && places.filter((place) => place.price >= req.params.priceMin);
      places =
        req.query.logitude &&
        req.query.latitude &&
        req.query.distance &&
        places.filter(
          (place) =>
            place.address.latitude <= req.query.latitude + req.query.distance / 110.574 &&
            place.address.latitude >= req.query.latitude - req.query.distance / 110.574 &&
            place.address.logitude <= req.query.logitude + req.query.distance / 110.574 &&
            place.address.logitude <= req.query.logitude + req.query.distance / 110.574
        );
      places = req.query.startDate && places.filter((place) => moment(req.query.startDate).isBetween(place.start, place.end), "day", []);
      res.send(places);
    }
  } catch (error) {
    next(error);
  }
});

placesRouter.get("/:id", async (req, res, next) => {
  try {
    const all = await getPlaces();
    const place = all.find((place) => place._id === req.params.id);
    res.send(place);
  } catch (error) {
    next(error);
  }
});
placesRouter.post(
  "/:id",
  cloudinaryMulter.single("image"),
  [
    check("title").isLength({ min: 4 }).withMessage("No way! title too short!").exists().withMessage("Add a title please!"),
    check("description").isLength({ min: 10 }).withMessage("No way! Description too short!").exists().withMessage("Add a description please!"),
    check("rooms info").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("street").exists().withMessage("Add street please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("latitude").isLatLong().withMessage("Incorrect Latitude").exists().withMessage("Add a latitude please!"),
    check("longitude").isLatLong().withMessage("Incorrect longitude").exists().withMessage("Add a longitude please!"),
    check("country").exists().withMessage("Add country please!"),
    check("price").isNumeric().exists().withMessage("Add Price please!"),
    check("roomsInfo").exists().withMessage("Add Room Info please!"),
    check("start").isDate().exists().withMessage("Please add start date of room availability"),
    check("end").isDate().exists().withMessage("Please add end date of room availability"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const owners = await getOwner();
        const owner = owners.find((singleOwner) => singleOwner._id === req.params.id);
        if (owner) {
          const places = await getPlaces();
          const newPlace = {
            houseFacilities: "",
            reviews: [],
            ...req.body,
            _id: uniqid(),
            houseOwner: req.params.id,
            image: req.file ? [req.file.path] : [],
          };
          places.push(newPlace);
          await writePlaces(places);
          res.status(201).send(newPlace);
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          err.message = "Owner Not Found";
          next(err);
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
placesRouter.put(
  "/:id",
  cloudinaryMulter.single("image"),
  [
    check("title").isLength({ min: 4 }).withMessage("No way! title too short!").exists().withMessage("Add a title please!"),
    check("description").isLength({ min: 10 }).withMessage("No way! Description too short!").exists().withMessage("Add a description please!"),
    check("rooms info").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("address").exists().withMessage("Add address please!"),
    check("city").exists().withMessage("Add City please!"),
    check("street").exists().withMessage("Add street please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("latitude").isLatLong().withMessage("Incorrect Latitude").exists().withMessage("Add a latitude please!"),
    check("longitude").isLatLong().withMessage("Incorrect longitude").exists().withMessage("Add a longitude please!"),
    check("country").exists().withMessage("Add country please!"),
    check("price").isNumeric().exists().withMessage("Add Price please!"),
    check("roomsInfo").exists().withMessage("Add Room Info please!"),
    check("start").isDate().exists().withMessage("Please add start date of room availability"),
    check("end").isDate().exists().withMessage("Please add end date of room availability"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.message = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const places = await getPlaces();
        const placeIndex = places.find((place) => place._id === req.params.id);
        if (placeIndex !== -1) {
          delete req.body._id;
          const updatePlace = {
            ...places[placeIndex],
            ...req.body,
          };
          const updated = [...places.slice(0, placeIndex), updatePlace, ...places.slice(placeIndex + 1)];
          places.push(updatePlace);
          await writePlaces(updated);
          res.status(201).send(updatePlace);
        } else {
          const err = new Error();
          err.httpStatusCode = 404;
          err.message = "Place Not Found";
          next(err);
        }
      }
    } catch (error) {
      next(error);
    }
  }
);
placesRouter.delete("/:id", async (req, res, next) => {
  try {
    const places = await getPlaces();
    const filterdPlaces = places.filter((place) => place._id !== req.params.id);
    if (filterdPlaces.length === places.length) {
      const error = new Error("Place not found");
      error.httpStatusCode = 404;
      return next(error);
    }
    writePlaces(filterdPlaces);
    res.status(201).send("Place has been deleted and removed from AirBnB");
  } catch (error) {
    next(error);
  }
});
module.exports = placesRouter;
