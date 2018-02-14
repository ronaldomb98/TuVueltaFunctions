const { check } = require('express-validator/check');

const rulesPost = [
    check('ano').exists().withMessage("Campo Obligatorio")
        .isNumeric().withMessage("Debe ser Tipo Numerico"),
    check('mes').exists().withMessage("Campo Obligatorio")
        .isNumeric().withMessage("Debe ser Tipo Numerico"),
    check('dia').exists().withMessage("Campo Obligatorio")
        .isNumeric().withMessage("Debe ser Tipo Numerico"),
    check('descripcion').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('idToken').exists().withMessage("Campo Obligatorio"),
]

module.exports = {
    rulesPost: rulesPost
}