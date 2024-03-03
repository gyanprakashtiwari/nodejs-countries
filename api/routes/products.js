const express = require('express')
const router = express.Router();
const Product = require('../models/product');
const mongoose = require('mongoose')

router.get("/",(req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Current page, default is 1
    const limit = parseInt(req.query.limit) || 10; // Number of documents per page, default is 10

    if (page < 1) {
        return res.status(400).json({ message: "Invalid page number. Page number must be greater than or equal to 1." });
    }

    // Perform two queries to get the total count and paginated documents
    const countQuery = Product.countDocuments();
    const dataQuery = Product.find()
        .select('name _id price')
        .skip((page - 1) * limit)
        .limit(limit);

    // Use Promise.all to execute both queries in parallel
    Promise.all([countQuery, dataQuery.exec()])
        .then(([totalProducts, products]) => {
            const totalPages = Math.ceil(totalProducts / limit);

            // Handle case when page number is greater than totalPages
            if (page > totalPages) {
                return res.status(404).json({ message: "Requested page not found. Exceeds total number of pages." });
            }

            const hasNextPage = page < totalPages;

            // Include pagination information in the response
            const response = {
                products,
                currentPage: page,
                totalProducts,
                totalPages,
                hasNextPage,
            };

            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({});
        });

});

router.post("/",(req, res, next) => {
    const product = new Product({
        _id : new mongoose.Types.ObjectId(),
        name : req.body.name,
        price : req.body.price
    });
    product.save()
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

router.get("/:productId",(req, res, next) => {
    const id = req.params.productId;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    Product.findById(id)
    .exec()
    .then(doc => {
        console.log("From database", doc);
        if (doc) {
            res.status(200).json(doc);
        } else {
            res.status(404).json({message : "No valid product found for provider ID"});
        }
        return;
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

router.patch("/:productId", async (req, res, next) => {
    try {
        const id = req.params.productId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID format" });
        }

        // Handle other specific operations that might throw exceptions
        const updateOps = req.body.reduce((ops, { propName, value }) => {
            ops[propName] = value;
            return ops;
        }, {});

        const result = await Product.updateOne({ _id: id }, { $set: updateOps });

        if (result.matchedCount === 1) {
            res.status(200).json({ message: "Product updated successfully" });
        } else {
            res.status(404).json({ message: "No valid product found for provided ID" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:productId",(req, res, next) => {
    const id = req.params.productId;
    Product.deleteOne({ _id: id })
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

module.exports = router;