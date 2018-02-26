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
let usersRouter = express.Router();


usersRouter.post('/nuevo', rules.rulesPost, (req, res) => {

    /**
     * Validate if the request has the required data
     */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    /** 
     * Get data from request.
     * Prepare the root object to interact with database
    */
    const { email, password, idToken } = req.body;
    const root = ref.root;

    /**
     * Validate if token is valid.
     * Check in the database the user Rol.
     */
    const p_token = admin.auth().verifyIdToken(idToken)
    const p_rol = p_token.then(response => {
        const { uid } = response
        
        return root.child(`/Administrativo/Usuarios/${uid}/Rol`).once('value')
    })

    /**
     * Verify if user has permissions to do this action. 
     * If user has permissions, then proceeds to create a new user.
     * If user doesn't have permissions return a error with the reason.
     */
    const p_hasPermision = p_rol.then(response => {
        if (response.val() === Globals.ROLES.Administrador) {
            return admin.auth().createUser({email: email, password: password})
        }
        return Promise.reject(new Error('Solo un Administrador puede hacer esta peticion.'))
    })

    /**
     * Return a response with success or error object for respective case.
     */
    return p_hasPermision.then(userRecord => {
        const uid = userRecord.uid;
        return res.status(200).type('application/json').send({ mensaje: "Usuario creado exitosamente", uid: uid });
    }).catch(err => {
        if (err) {
            return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear usuario.', error: err.message })
        }
        return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear usuario.' })
    })
})

exports.usersRouter = usersRouter