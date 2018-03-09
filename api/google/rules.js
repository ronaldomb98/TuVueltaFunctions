const { check } = require('express-validator/check');

const distanceMatrix = [
    check('origins').exists().withMessage("Campo Obligatorio"),
    check('destinations').exists().withMessage("Campo Obligatorio"),
    check('idToken').exists().withMessage("Campo Obligatorio")
]

const geocode = [
    check('idToken').exists().withMessage("Campo Obligatorio")
]

const directions = [
    check('idToken').exists().withMessage("Campo Obligatorio")
]

module.exports = {
    distanceMatrix: distanceMatrix,
    geocode: geocode,
    directions: directions
}
