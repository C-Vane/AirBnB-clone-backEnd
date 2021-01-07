const express = require("express");
const { Transform } = require("json2csv");
const { pipeline } = require("stream");
const { join } = require("path");
const { createReadStream } = require("fs-extra");
const { check, validationResult } = require("express-validator");
const { getUsers, writeUsers, getReviews, getPlaces, getBookings, writeBookings } = require("../../utilites");
const uniqid = require("uniqid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../../cloudinary");
const moment = require("moment");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "striveFlix/users",
  },
});

const cloudinaryMulter = multer({ storage: storage });

const usersRouter = express.Router();
usersRouter.get("/", async (req, res, next) => {
  try {
    const all = await getUsers();
    let users;
    if (req.query && req.query.email) {
      users = all.find((user) => user.email === req.query.email);
    }
    res.send(users);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const all = await getUsers();
    const user = all.find((user) => user._id === req.params.id);
    res.send(user);
  } catch (error) {
    next(error);
  }
});
usersRouter.post(
  "/",
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("yearOfBirth").isNumeric().withMessage("Year of pirth should be a number").exists().withMessage("Add a Year of birth please!"),
    check("street").isLength({ min: 5 }).withMessage("Invalid street").exists().withMessage("Add street please!"),
    check("city").exists().withMessage("Add City please!"),
    check("country").exists().withMessage("Add country Please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("cardExpDate").exists().withMessage("Add Exp. Date please!"),
    check("cardNumber").exists().withMessage("Add Credit Card Number please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
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
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const newUser = {
            ...req.body,
            _id: uniqid(),
            role: "client",
          };
          users.push(newUser);
          await writeUsers(users);
          res.status(201).send(newUser);
        }
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.put(
  "/:id",
  [
    check("name").isLength({ min: 4 }).withMessage("No way! Name too short!").exists().withMessage("Add a name please!"),
    check("surname").isLength({ min: 4 }).withMessage("No way! Surname too short!").exists().withMessage("Add a surname please!"),
    check("email").isEmail().withMessage("No way! Email not correct!").exists().withMessage("Add an email please!"),
    check("yearOfBirth").isNumeric().withMessage("Year of pirth should be a number").exists().withMessage("Add a Year of birth please!"),
    check("street").isLength({ min: 5 }).withMessage("Invalid street").exists().withMessage("Add street please!"),
    check("city").exists().withMessage("Add City please!"),
    check("country").exists().withMessage("Add country Please!"),
    check("postalCode").exists().withMessage("Add Postal Code please!"),
    check("cardExpDate").exists().withMessage("Add Exp. Date please!"),
    check("cardNumber").exists().withMessage("Add Credit Card Number please!"),
    check("password").isLength({ min: 8 }).isAlphanumeric().exists().withMessage("Add a valid password please!"),
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
        const users = await getUsers();
        const email = users.find((user) => user.email === req.body.email && user._id !== req.params.id);
        if (email) {
          const err = new Error();
          err.message = "Email already used";
          err.httpStatusCode = 409;
          next(err);
        } else {
          const userIndex = users.findIndex((user) => user._id === req.params.id);
          if (userIndex !== -1) {
            delete req.body._id;
            const updateUser = {
              ...users[userIndex],
              ...req.body,
            };
            const updatedDB = [...users.slice(0, userIndex), updateUser, ...users.slice(userIndex + 1)];
            await writeUsers(updatedDB);
            res.status(201).send(updateUser);
          } else {
            const err = new Error();
            err.httpStatusCode = 404;
            err.message = "User Not Found";
            next(err);
          }
        }
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const users = await getUsers();
    const filterdUsers = users.filter((user) => user._id !== req.params.id);
    if (filterdUsers.length === users.length) {
      const error = new Error("User not found");
      error.httpStatusCode = 404;
      return next(error);
    }
    await writeUsers(filterdUsers);
    res.status(201).send("Account has been deleted");
  } catch (error) {
    next(error);
  }
});
///Get bookings list
usersRouter.get("/:id/myBookings", async (req, res, next) => {
  try {
    const bookings = await getBookings();
    const mylist = bookings.find((bookings) => bookings.clientId === req.params.id) || [];
    res.send(mylist);
  } catch (error) {
    next(error);
  }
});
usersRouter.post(
  "/:id/booking/",
  [
    check("start").isDate().exists().withMessage("Please add start date "),
    check("end").isDate().exists().withMessage("Please add end date "),
    check("placeId").exists().withMessage("Please add the place Id "),
  ],
  async (req, res, next) => {
    try {
      const users = await getUsers();

      const userIndex = users.findIndex((user) => user._id === req.params.id);

      if (userIndex !== -1) {
        const places = await getPlaces();
        const place = places.find((place) => place._id === req.body.placeId);

        if (place) {
          const bookings = await getBookings();
          const currentBookings = bookings.filter((booking) => booking.placeId === req.body.placeId);
          let available =
            moment(req.body.start).isBetween(place.start, place.end, "day", []) && moment(req.body.end).isBetween(place.start, place.end, "day", [])
              ? currentBookings.length > 0
                ? bookings.every((booking) => !moment(req.body.start).isBetween(booking.start, booking.end, "day", []) && !moment(req.body.end).isBetween(booking.start, booking.end, "day", []))
                  ? true
                  : false
                : true
              : true;
          if (available) {
            //book
            const newBooking = {
              ...req.body,
              _id: uniqid(),
              userName: +-+5 < [userIndex].name + " " + users[userIndex].surname,
              userEmail: user[userIndex].email,
              userId: req.params.id,
            };
            //send email-
            await writeBookings(bookings.push(newBooking));
            res.status(201).send(newBooking);
          } else {
            const err = new Error();
            err.message = "Place not available in this period";
            err.httpStatusCode = 409;
            next(err);
          }
        } else {
          const err = new Error();
          err.message = "Place  not found";
          err.httpStatusCode = 404;
          next(err);
        }
      } else {
        const err = new Error();
        err.message = "Client not found";
        err.httpStatusCode = 404;
        next(err);
      }
    } catch (error) {
      next(error);
    }
  }
);
usersRouter.delete("/:id/booking/:bookingId", async (req, res, next) => {
  try {
    const bookings = await getBookings();
    const booking = bookings.filter((booking) => !(booking._id === req.params.bookingId && booking.userId === req.params.id));
    if (booking.length !== bookings) {
      res.status(201).send("Booking calceled");
    } else {
      const err = new Error();
      err.message = "Booking or client not found";
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

/// POST Profile picture

usersRouter.post("/:id/upload", cloudinaryMulter.single("image"), async (req, res, next) => {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex((user) => user._id === req.params.id);

    if (userIndex !== -1) {
      // user found
      const updatedusers = [...users.slice(0, userIndex), { ...users[userIndex], image: req.file.path }, ...users.slice(userIndex + 1)];
      await writeUsers(updatedusers);
      res.send(updatedusers[userIndex]);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      err.message = "user Not Found";
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
module.exports = usersRouter;
