const functions = require('firebase-functions');
const rp = require('request-promise');
const express = require('express')
const app = express();
const rules = require('./rules')
const { check, validationResult } = require('express-validator/check');
const Globals = require('../../both/globals')
// Add default Configuration
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase)
}
const ref = admin.database().ref()
let holidaysRouter = express.Router();
holidaysRouter.post('', rules.rulesPost, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    const { ano, mes, dia, descripcion, idToken } = req.body;
    const root = ref.root;
    const date = new Date(ano, mes, dia);
    const time = date.getTime();

    const p_token = admin.auth().verifyIdToken(idToken)
    const p_rol = p_token.then(response => {
        const { uid } = response
        return root.child(`/Administrativo/Usuarios/${uid}/Rol`).once('value')
    })

    const p_hasPermision = p_rol.then(response => {
        if (response.val() === Globals.ROLES.Administrador) {
            return ref.child(`/Administrativo/InfoRecargos/Festivos/${time}`).update({ Nombre: descripcion })
        }
        return Promise.reject(new Error('Solo un Administrador puede hacer una solicitud.'))
    })

    return p_hasPermision.then(response => {
        return res.status(200).type('application/json').send({ mensaje: "Festivo creado exitosamente", festivo: descripcion, festivo_id: time });
    }).catch(err => {
        if (err) {
            return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear festivo.', error: err.message })
        }
        return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear festivo.' })
    })
})

exports.holidaysRouter = holidaysRouter