const { readJSON, writeJSON } = require("fs-extra");
const { join } = require("path");

const placesPath = join(__dirname, "./services/places/places.json");
const usersPath = join(__dirname, "./services/users/users.json");
const ownersPath = join(__dirname, "./services/owners/owners.json");
const reviewsPath = join(__dirname, "./services/reviews/reviews.json");

const readDB = async (filePath) => {
  try {
    const fileJson = await readJSON(filePath);
    return fileJson;
  } catch (error) {
    throw new Error(error);
  }
};

const writeDB = async (filePath, fileContent) => {
  try {
    await writeJSON(filePath, fileContent);
  } catch (error) {
    throw new Error(error);
  }
};
module.exports = {
  getPlaces: async () => readDB(placesPath),
  writePlaces: async (placesData) => writeDB(placesPath, placesData),
  getUsers: async () => readDB(usersPath),
  writeUsers: async (usersData) => writeDB(usersPath, usersData),
  getReviews: async () => readDB(reviewsPath),
  writeReviews: async (reviewsData) => writeDB(reviewsPath, reviewsData),
  getOwners: async () => readDB(ownersPath),
  writeOwners: async (ownersData) => writeDB(ownersPath, ownersData),
};
