const functions = require('firebase-functions');
const rp = require('request-promise');
const express = require('express')
const app = express();
const rules = require('./rules')
const { check, validationResult } = require('express-validator/check');
const Globals = require('../../both/globals')
const nodemailer = require('nodemailer'); // email sender function 
// Add default Configuration
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase)
}
const ref = admin.database().ref()
let reportsRouter = express.Router();
reportsRouter.post('/enviar-mail', rules.rulesPost, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    const { to, text, subject } = req.body;
    const root = ref.root;

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: '<CORREO TU VUELTA>',
            pass: '<CONTRASEÑA CORREO>'
        }
    });
    const mailOptions = {
        from: 'TuVuelta',
        to: to,
        subject: subject,
        html: text
    };

    const p = transporter.sendMail(mailOptions).then(res => {
        console.log("Email sent");
        
        return res.status(200).type('application/json')
            .send({
                mensaje: "Mensaje Enviado",
                status: 200
            })
    }).catch(err => {
        console.log(err);
        return res.status(500).type('application/json')
        .send({
            mensaje: "Falló el envio",
            status: 500
        });
    })

    return p

})

exports.reportsRouter = reportsRouter