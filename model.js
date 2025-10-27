const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema({
  name: String,
  location: String,
  description: String,
  image: String
});

const Hotel = mongoose.model('Hotel', hotelSchema);


module.exports = { Hotel };
