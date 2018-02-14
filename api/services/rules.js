const { check } = require('express-validator/check');

const rulesPost = [
    check('puntoInicio').exists().withMessage("Campo Obligatorio"),
    check('puntoFinal').exists().withMessage("Campo Obligatorio"),
    check('esPagoConTarjeta').exists().withMessage("Campo Obligatorio")
        .isBoolean()
        .withMessage('Debe ser de tipo booleano.'),
    check('Nombres').exists().withMessage("Campo Obligatorio"),
    check('Apellidos').exists().withMessage("Campo Obligatorio"),
    check('Celular').exists().withMessage("Campo Obligatorio"),
    check('user_id').exists().withMessage("Campo Obligatorio"),
    check('ValorDomicilio').exists().withMessage("Campo Obligatorio")
        .isNumeric()
        .withMessage('Debe ser de tipo numerico.'),
    check('idToken').exists().withMessage("Campo Obligatorio"),
    check('DescripcionDomicilio').exists()
        .withMessage("Campo Obligatorio. Ej: Torreon 5 Apt 302 Entrada 3")
        .isLength({ min: 1 }).withMessage("Debe contener al menos un caracter")
]

module.exports = {
    rulesPost: rulesPost
}