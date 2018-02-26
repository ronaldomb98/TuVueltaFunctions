const { check } = require('express-validator/check');

const rulesPost = [
    check('email').exists().withMessage("Campo Obligatorio"),
    check('password').exists().withMessage("Campo Obligatorio"),
    check('idToken').exists().withMessage("Campo Obligatorio"),
]

module.exports = {
    rulesPost: rulesPost
}