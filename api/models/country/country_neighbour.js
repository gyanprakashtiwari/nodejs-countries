const mongoose = require('mongoose');

const countryNeighboursSchema = new mongoose.Schema({
    country_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    neighbour_country_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create a compound index to ensure uniqueness of country_id and neighbour_country_id
countryNeighboursSchema.index({ country_id: 1, neighbour_country_id: 1 }, { unique: true });

// Update the 'updated_at' field before saving the document
countryNeighboursSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

const CountryNeighbours = mongoose.model('CountryNeighbours', countryNeighboursSchema);

module.exports = CountryNeighbours;
