const express = require('express')
const router = express.Router();
const Country = require('../models/country/country');
const CountryNeighbours = require('../models/country/country_neighbour');


const mongoose = require('mongoose')

// Get Countries List Paginated with sort by options name , population & area both ascending and descending
router.get("/", (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Current page, default is 1
    const limit = parseInt(req.query.limit) || 10; // Number of documents per page, default is 10
    const sortParams = req.query.sort_by ? req.query.sort_by.split(",") : ["name_asc"]; // Default sorting by name ascending

    if (page < 1) {
        return res.status(400).json({ message: "Invalid page number. Page number must be greater than or equal to 1." });
    }

    // Construct the sorting object based on the sortParams
    const sortOptions = {};
    sortParams.forEach(param => {
        const [field, order] = param.split("_");
        const sortOrder = order.toLowerCase() === "desc" ? -1 : 1;
        sortOptions[field] = sortOrder;
    });


    // Perform two queries to get the total count and paginated documents with sorting
    const countQuery = Country.countDocuments();
    const dataQuery = Country.find()
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);

    // Use Promise.all to execute both queries in parallel
    Promise.all([countQuery, dataQuery])
        .then(([totalCountries, countries]) => {
            const totalPages = Math.ceil(totalCountries / limit);

            // Handle case when the page number is greater than totalPages
            if (page > totalPages) {
                return res.status(404).json({ message: "Requested page not found. Exceeds the total number of pages." });
            }

            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            // Include pagination information in the response
            const response = {
                message: "List of Countries",
                data: {
                    countries,
                    currentPage: page,
                    totalCountries,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage
                }
            };

            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({});
        });
});


router.post("/",(req, res, next) => {
    const country = new Country({
        _id : new mongoose.Types.ObjectId(),
        name : req.body.name,
        cca : req.body.cca,
        currency_code : req.body.currency_code,
        currency : req.body.currency,
        capital : req.body.capital,
        region : req.body.region,
        subregion : req.body.subregion,
        area : req.body.area,
        map_url : req.body.map_url,
        population : req.body.population,
        flag_url : req.body.flag_url
    });
    country.save()
    .then(result => {
        console.log(result);
        const response = {
            name: result.name,
            price: result.price,
            _id: result._id,
            request: {
                type: "GET",
                url: req.protocol + '://' + req.get('host') + req.originalUrl + '/' + result._id
            }
        };
        res.status(201).json(response);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

router.get("/:countryId",(req, res, next) => {
    const id = req.params.countryId;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid country ID format" });
    }

    Country.findById(id)
    .exec()
    .then(doc => {
        console.log("From database", doc);
        if (doc) {
            res.status(200).json(doc);
        } else {
            res.status(404).json({message : "No valid country found for country ID"});
        }
        return;
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

router.get("/:countryId/neighbours", async (req, res, next) => {
    const countryId = req.params.countryId;
    const perPage = parseInt(req.query.per_page) || 10;
    const page = parseInt(req.query.page) || 1;

    if (!mongoose.Types.ObjectId.isValid(countryId)) {
        return res.status(400).json({ message: "Invalid country ID format" });
    }

    try {
        // Count total number of neighbours
        const totalNeighbours = await CountryNeighbours.countDocuments({ country_id: countryId }).exec();

        // Calculate total pages
        const totalPages = Math.ceil(totalNeighbours / perPage);

        // Perform pagination
        const neighbours = await CountryNeighbours.find({ country_id: countryId })
            .select('neighbour_country_id')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        const neighbourIds = neighbours.map(neighbour => neighbour.neighbour_country_id);

        // Fetch neighbour countries
        const countries = await Country.find({ _id: { $in: neighbourIds } }).exec();

        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        res.status(200).json({
            message: "Neighbour Countries",
            data : {
                neighbour_countries: countries,
                total: totalNeighbours,
                hasNextPage,
                hasPreviousPage,
                totalPages,
                page,
                per_page: perPage
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// add countries neighbour
router.post("/:countryId/neighbours", async (req, res, next) => {
    const countryId = req.params.countryId;
    const neighbourId = req.body.neighbour_country_id;

    if (!mongoose.Types.ObjectId.isValid(countryId) || !mongoose.Types.ObjectId.isValid(neighbourId)) {
        return res.status(400).json({ message: "Invalid country ID or neighbour_country_id format" });
    }

    try {
        // Check if the provided country and neighbour IDs exist
        const [country, neighbour] = await Promise.all([
            Country.findById(countryId).exec(),
            Country.findById(neighbourId).exec()
        ]);

        if (!country || !neighbour) {
            return res.status(404).json({ message: "One or more countries not found" });
        }

        // Check if the country and neighbour are already neighbours
        const existingNeighbour = await CountryNeighbours.findOne({ country_id: countryId, neighbour_country_id: neighbourId }).exec();

        if (existingNeighbour) {
            return res.status(400).json({ message: "These countries are already neighbours" });
        }

        // Create a new neighbour entry
        const newNeighbour = new CountryNeighbours({
            country_id: countryId,
            neighbour_country_id: neighbourId
        });

        // Save the new neighbour entry
        await newNeighbour.save();

        res.status(201).json({ message: "Neighbour added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.patch("/:CountryId", async (req, res, next) => {
    try {
        const id = req.params.CountryId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Country ID format" });
        }

        // Handle other specific operations that might throw exceptions
        const updateOps = req.body.reduce((ops, { propName, value }) => {
            ops[propName] = value;
            return ops;
        }, {});

        const result = await Country.updateOne({ _id: id }, { $set: updateOps });

        if (result.matchedCount === 1) {
            res.status(200).json({ message: "Country updated successfully" });
        } else {
            res.status(404).json({ message: "No valid Country found for provided ID" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/*
// Add multiple neighbours for a country
router.post("/:countryId/neighbours", async (req, res, next) => {
    const countryId = req.params.countryId;
    const neighbourIds = req.body.neighbour_country_ids;

    if (!mongoose.Types.ObjectId.isValid(countryId) || !Array.isArray(neighbourIds) || neighbourIds.length === 0) {
        return res.status(400).json({ message: "Invalid country ID or neighbour_country_ids format" });
    }

    try {
        // Check if the provided country exists
        const country = await Country.findById(countryId).exec();

        if (!country) {
            return res.status(404).json({ message: "Country not found" });
        }

        // Check if the provided neighbours exist
        const neighbours = await Country.find({ _id: { $in: neighbourIds } }).exec();

        if (neighbours.length !== neighbourIds.length) {
            return res.status(404).json({ message: "One or more neighbours not found" });
        }

        // Check if any of the neighbours are already neighbours
        const existingNeighbours = await CountryNeighbours.find({ country_id: countryId, neighbour_country_id: { $in: neighbourIds } }).exec();

        if (existingNeighbours.length > 0) {
            return res.status(400).json({ message: "One or more of these countries are already neighbours" });
        }

        // Create new neighbour entries
        const newNeighbours = neighbourIds.map(neighbourId => ({
            country_id: countryId,
            neighbour_country_id: neighbourId
        }));

        // Save the new neighbour entries
        await CountryNeighbours.insertMany(newNeighbours);

        res.status(201).json({ message: "Neighbours added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:productId",(req, res, next) => {
    const id = req.params.productId;
    Country.deleteOne({ _id: id })
        .exec()
        .then(result => {
            // Check if any document was deleted
            if (result.deletedCount === 1) {
                const response = {
                    message: "Product deleted",
                    request: {
                        type: "POST",
                        url: req.protocol + '://' + req.get('host') + '/products',
                        body: { name: "String", price: "Number"}
                    }
                };
                res.status(200).json(response);
            } else {
                res.status(404).json({ message: "No valid product found for provided ID" });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });
    
});
*/


module.exports = router;