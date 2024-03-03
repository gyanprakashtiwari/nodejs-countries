const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const productRoutes = require('./api/routes/products')
const orderRoutes = require('./api/routes/order')
const countryRoutes = require('./api/routes/country')


app.use((req, res, next)=>{
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS'){
        res.header('Access-Control-Allow-Methods','PUT, POST, PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

mongoose.connect(
    process.env.DATABASE_URI
);
mongoose.Promise = global.Promise;

app.use(morgan('dev'));
app.use(express.json()); 

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/countries', countryRoutes);

app.use((req, res, next)=>{
    res.status(200).send('<h1>Countries Assignement API setup completed</h1>');
    next();
})

app.use((error,req, res, next)=>{
    res.status(error.status || 500);
    res.json({
        error : {
            message : error.message
        }
    });
})

module.exports = app;