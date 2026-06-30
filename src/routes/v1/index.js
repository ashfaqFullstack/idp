const express = require('express');
const userRoute = require('./user.route')
const authRoute = require('./auth.route')
const applicationRoute = require('./application.route')
const planRoute = require('./plan.route')

const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute,
    },
    {
        path: '/users',
        route: userRoute,
    },
    {
        path: "/application",
        route: applicationRoute
    },
    {
        path: "/plans",
        route: planRoute
    }
];

// const devRoutes = [
//     // routes available only in development mode
//     {
//         path: '/docs',
//         route: docsRoute,
//     },
// ];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route)
})


// if (config.env === 'development') {
//     devRoutes.forEach((route) => {
//         router.use(route.path, route.route);
//     });
// };

module.exports = router;