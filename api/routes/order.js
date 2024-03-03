const express = require('express')
const router = express.Router();

router.get("/",(req, res, next) => {
    console.log("START-->");
    console.log(req.headers);
    console.log(req);
    console.log(typeof req);
    console.log(res);
    console.log(typeof res);
    console.log("END-->");

    res.status(200).json({
        "message" : "Handling GET request to /orders"
    });
});

router.post("/",(req, res, next) => {
    const order = {
        productId : req.body.productId,
        quantity : req.body.quantity
    }
    res.status(201).json({
        message : "Handling POST request to /orders",
        createdOrder : order
    });
});

router.get("/:orderId",(req, res, next) => {
    const id = req.params.orderId;
    if (id === 'special'){
        res.status(200).json({
            "message" : "Special id selected",
            "id" : id
        });
    }else{
        res.status(200).json({
            "message" : "You passed an ID"
        });
    }
});

router.patch("/:orderId",(req, res, next) => {
    const id = req.params.orderId;
    res.status(200).json({
        "message" : "Updated product " + id
    });
    
});

router.delete("/:orderId",(req, res, next) => {
    const id = req.params.orderId;
    res.status(200).json({
        "message" : "Deleted product " + id
    });
    
});

module.exports = router;