const { check } = require('express-validator/check');

const rulesPost = [
    check('to').exists().withMessage("Campo Obligatorio"),
    check('text').exists().withMessage("Campo Obligatorio"),
    check('subject').exists().withMessage("Campo Obligatorio")
        
]

module.exports = {
    rulesPost: rulesPost
}