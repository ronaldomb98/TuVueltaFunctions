const functions = require('firebase-functions');
var request = require('request');
var rp = require('request-promise');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
/* exports.loadDistanceAndDuration = functions.database
    .ref('/Solicitud/{pushId}')
    .onWrite(event=> {
        const schedule = event.data.val()
        if (schedule.distancia && schedule.duracion) {
            return
        }

        // Global data
        var puntoInicio = schedule.puntoInicio.replace(' ','+')
        var puntoFinal = schedule.puntoFinal.replace(' ','+')
        console.log("punto Inicio: "+ puntoInicio)
        console.log("punto Final: "+ puntoFinal)
        var _puntoInicialCoor = '';
        var _puntoFinalCoor = '';
        
        // Geocoding config
        const apiGeocodingUrl = "https://maps.googleapis.com/maps/api/geocode/json";
        const KEY_GEOCODING = "AIzaSyBa-_VGSDZw9TinVFhVFo2lM4BQ_H0l194";
        const urlPuntoInical = apiGeocodingUrl
                          +'?address='+puntoInicio
                          +'&key='+KEY_GEOCODING

        const urlPuntoFinal = apiGeocodingUrl
                          +'?address='+puntoFinal
                          +'&key='+KEY_GEOCODING
        
        // Geocoding get puntoInical
        request.post(urlPuntoInical,{}, (err, httpResponse, body)=>{
            if (err) {
                console.log("Algo salio mal")
            }
            var _body = JSON.parse(body)
            console.log("Info de punto inicial")
            console.log(_body.results[0])
            var inicialCoors = _body.results[0].geometry.location
            _puntoInicialCoor = inicialCoors.lat+','+inicialCoors.lng

            // Geocoding get puntoFinal
            request.post(urlPuntoFinal,{}, (err, httpResponse, finalbody)=>{
                if (err) {
                    console.log("Algo salio mal")
                }
                var _finalbody = JSON.parse(finalbody)
                console.log("Info de punto Final")
                console.log(finalbody.results[0])
                var finalCoors = _finalbody.results[0].geometry.location
                _puntoFinalCoor = finalCoors.lat+','+finalCoors.lng

                // POST to get distance and duration
                const apiDistanceMatrixUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";
                const API_KEY = "AIzaSyDjPraTx4A9TO4UMKgE24rAu2YANT4WjsM";
                
                const url = apiDistanceMatrixUrl
                                    +'?origins='+_puntoInicialCoor
                                    +'&destinations='+_puntoFinalCoor
                                    +'&language=pt-PT'
                                    +'&key='+API_KEY

                request.post(url,{},(err, httpResponse, body) => {
                    if (err) {
                        console.log("algo salio mal")
                    }
                    var __body = JSON.parse(body)
                    schedule.distancia = __body.rows[0].elements[0].distance;
                    schedule.duracion = __body.rows[0].elements[0].duration;
                    return event.data.ref.set(schedule)
                })
            })

            
        })
        
    }) */


// SET punto Inicio

exports.addPointInit = functions.database
    .ref('/Solicitud/{pushId}')
    .onCreate(event=> {
        var schedule = event.data.val()
        console.log("Cargando punto Inicio")
        
        // Global data
        var puntoInicio = encodeURIComponent(schedule.puntoInicio)
        console.log("punto Inicio: "+ puntoInicio)
        
        // Geocoding config
        const apiGeocodingUrl = "https://maps.googleapis.com/maps/api/geocode/json";
        const KEY_GEOCODING = "AIzaSyBa-_VGSDZw9TinVFhVFo2lM4BQ_H0l194";
        const urlPuntoInical = apiGeocodingUrl+'?address='+puntoInicio+'&key='+KEY_GEOCODING
        console.log(urlPuntoInical)
        // Geocoding get puntoInical
        request.get(urlPuntoInical,{}, (err, httpResponse, body) =>{
            if (err) {
                console.log("Algo salio mal")
            }
            console.log("Antes de transformarlo")
            console.log(body)
            var _body = JSON.parse(body)
            console.log("Info de punto inicial")
            console.log(_body)
            var inicialCoors = _body.results[0].geometry.location
            schedule.puntoInicialCoors = inicialCoors.lat+','+inicialCoors.lng
            return event.data.ref.set(schedule)
        })
        
    })


// SET punto Final

exports.setPointFinal = functions.database
    .ref('/Solicitud/{pushId}')
    .onCreate(event=> {
        const schedule = event.data.val()
    console.log("Cargando punto Final")
        // Global data
        var puntoFinal = encodeURIComponent(schedule.puntoFinal) 
        console.log("punto Final: "+ puntoFinal)
        var _puntoInicialCoor = '';
        var _puntoFinalCoor = '';
        
        // Geocoding config
        const apiGeocodingUrl = "https://maps.googleapis.com/maps/api/geocode/json";
        const KEY_GEOCODING = "AIzaSyBa-_VGSDZw9TinVFhVFo2lM4BQ_H0l194";

        const urlPuntoFinal = apiGeocodingUrl+'?address='+puntoFinal+'&key='+KEY_GEOCODING
        
        // Geocoding get puntoFinal
        request.get(urlPuntoFinal,{}, (err, httpResponse, finalbody)=>{
            if (err) {
                console.log("Algo salio mal")
            }
            var _finalbody = JSON.parse(finalbody)
            console.log("Info de punto Final")
            console.log(_finalbody.results[0])
            var finalCoors = _finalbody.results[0].geometry.location
            schedule.puntoFinalCoors = finalCoors.lat+','+finalCoors.lng
            return event.data.ref.set(schedule)
        })
    }) 
// SET distance and duration
/* exports.setDistanceAndDuration = functions.database
    .ref('/Solicitud/{pushId}')
    .onWrite(event=> {
        const schedule = event.data.val()
        
        if (schedule.puntoInicialCoors && schedule.puntoFinalCoors) {
            console.log("Cargando punto distancia y tiempo")
            // Global data
            var _puntoInicialCoor = schedule.puntoInicialCoors
            var _puntoFinalCoor = schedule.puntoFinalCoors


            // POST to get distance and duration
            const apiDistanceMatrixUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";
            const API_KEY = "AIzaSyDjPraTx4A9TO4UMKgE24rAu2YANT4WjsM";
            
            const url = apiDistanceMatrixUrl
                                +'?origins='+_puntoInicialCoor
                                +'&destinations='+_puntoFinalCoor
                                +'&language=pt-PT'
                                +'&key='+API_KEY

            request.post(url,{},(err, httpResponse, body) => {
                if (err) {
                    console.log("algo salio mal")
                }
                var __body = JSON.parse(body)
                schedule.distancia = __body.rows[0].elements[0].distance;
                schedule.duracion = __body.rows[0].elements[0].duration;
                return event.data.ref.set(schedule)
            })
        }else {
            return
        } 
    })*/
