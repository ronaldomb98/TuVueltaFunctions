const functions = require('firebase-functions');
const rp = require('request-promise');
const express = require('express')
const app = express();
const rules = require('./rules')
const evironemnt = require('../../config/environment.js')
const { check, validationResult } = require('express-validator/check');
const Globals = require('../../both/globals')
// Add default Configuration
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase)
}
const ref = admin.database().ref()
let googleRouter = express.Router();


googleRouter.post('/distancematrix', rules.distanceMatrix, (req, res) => {
    /**
     * Validate if the request has the required data
     */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    /** 
     * Get data from request and validate if user has a valid token.
    */
    const { destinations, origins, idToken } = req.body;
    const p_token = admin.auth().verifyIdToken(idToken)

    /**
     * Make the request to google api and return a response.
     */
    return p_token.then(res => {
        const key = evironemnt.google.distanceMatrix;
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
            `origins=${origins}&` +
            `destinations=${destinations}&` +
            `key=${key}`;
        const options = { method: 'POST', uri: url, json: true };
        return rp.get(options)

    }).then(snap => {
        return res.status(200).type('application/json').send({ mensaje: "Distance Matrix", data: snap });
    }).catch(err => {
        return res.status(500).type('application/json').send({ mensaje: 'Error calculando la distancia', err: err.message })
    })
})

googleRouter.post('/geocode', rules.geocode, (req, res) => {
    /**
     * Validate if the request has the required data
     */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    /** 
     * Get data from request and validate if user has a valid token.
    */
    const { latlng, result_type, idToken } = req.body;
    const p_token = admin.auth().verifyIdToken(idToken)
    const _params = Object.keys(req.body).filter(key => key !== 'idToken')
    /**
     * Make the request to google api and return a response.
     * `latlng=${latlng}&` +
            `result_type=${result_type}&` +
     */
    return p_token.then(res => {
        const key = evironemnt.google.geocoding;
        let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${key}`;
        _params.forEach(key => url+=`&${key}=${req.body[key]}`)
        const options = { method: 'POST', uri: url, json: true };
        return rp.get(options)

    }).then(snap => {
        return res.status(200).type('application/json').send({ mensaje: "Geocode", data: snap });
    }).catch(err => {
        return res.status(500).type('application/json').send({ mensaje: 'Error Geocodificando', err: err.message })
    })
})

exports.googleRouter = googleRouter