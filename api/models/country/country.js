const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    name: { type: String, required: true },
    cca: { type: String, required: true },
    currency_code: { type: String, required: true },
    currency: { type: String, required: true },
    capital: { type: String, required: true },
    region: { type: String, required: true },
    area: { type: Number, required: true },
    population: { type: Number, required: true },
    subregion: { type: String, required: false },
    map_url: { type: String, required: false },
    flag_url: { type: String, required: false }
});

countrySchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

const Country = mongoose.model('Country', countrySchema);

module.exports = Country;
