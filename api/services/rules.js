const { check } = require('express-validator/check');

const rulesPost = [
    check('puntoInicio').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('puntoFinal').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('esPagoConTarjeta').exists().withMessage("Campo Obligatorio")
        .isBoolean()
        .withMessage('Debe ser de tipo booleano.'),
    check('Nombres').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('Apellidos').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('Celular').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('user_id').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('ValorDomicilio').exists().withMessage("Campo Obligatorio")
        .isNumeric()
        .withMessage('Debe ser de tipo numerico.'),
    check('idToken').exists().withMessage("Campo Obligatorio")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter"),
    check('DescripcionDomicilio').exists()
        .withMessage("Campo Obligatorio. Ej: Torreon 5 Apt 302 Entrada 3")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter")
]

module.exports = {
    rulesPost: rulesPost
}