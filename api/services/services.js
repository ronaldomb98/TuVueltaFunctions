const functions = require('firebase-functions');
const rp = require('request-promise');
const express = require('express')
const app = express();
const rules = require('./rules')
const Globals = require('../../both/globals')
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
const OneSignal = require('onesignal-node');
let errMessage = '';
const moment = require('moment-timezone');

// Add default Configuration
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase)
}

// create a new Client for a single app
const myClient = new OneSignal.Client({
    userAuthKey: 'ZmM1YTQxZmMtYTIzZi00Njc3LTgyYTMtYmYxZTE4ZTA4YTMx',
    // note that "app" must have "appAuthKey" and "appId" keys
    app: { appAuthKey: 'ZmM1YTQxZmMtYTIzZi00Njc3LTgyYTMtYmYxZTE4ZTA4YTMx', appId: 'c65f216a-e1bc-4db8-a58d-d15bc07ca5a2' }
});

const ref = admin.database().ref()
let servicesRouter = express.Router();

const getFullDistance = (schedule) => {
    const distanceIda = schedule.distanciaIda
    const distanceVuelta = schedule.distanciaVuelta
    const numberDistanceIda = parseFloat(distanceIda.text.replace(',', '.'))
    if (distanceVuelta) {
        const numberDistanceVuelta = parseFloat(distanceVuelta.text.replace(',', '.'))
        return Math.round(numberDistanceIda + numberDistanceVuelta)
    }
    return Math.round(numberDistanceIda)
}

const getTotalPayment = (sti_rate, fullDistanceMts) => {
    let totalPayment = 0
    let missingDistance = fullDistanceMts
    const mtsOnAKm = 1000
    missingDistance -= sti_rate.Tarifa1.maxKm * mtsOnAKm
    totalPayment += sti_rate.Tarifa1.value

    if (missingDistance < 0) {
        return totalPayment
    }
    const diferenceT1T2Km = sti_rate.Tarifa2.maxKm - sti_rate.Tarifa1.maxKm
    const valuediferenceT1T2Km = diferenceT1T2Km * sti_rate.Tarifa2.value
    const diferenceT1T2Mts = diferenceT1T2Km * mtsOnAKm

    if ((missingDistance - diferenceT1T2Mts) < 0) {
        totalPayment += (missingDistance * valuediferenceT1T2Km) / diferenceT1T2Mts
        return totalPayment
    }
    totalPayment += valuediferenceT1T2Km
    missingDistance -= diferenceT1T2Mts
    const valueByMtsT3 = sti_rate.Tarifa3.value / mtsOnAKm
    totalPayment += valueByMtsT3 * missingDistance

    return totalPayment
}

servicesRouter.post('', rules.rulesPost, (req, res) => {

    // Validate if body has required data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    // Global constanst
    const servicio_id = req.body.servicioId;
    const fiveHours = 18000000;
    const date = new Date();
    const uid = servicio_id ? servicio_id : date.getTime();
    const codigoBogota = '11001'
    const refSchedule = ref.child('/Operativo/Solicitud/' + uid)
    const root = ref.root;
    let _codigoCiudad = '';
    if (!req.body.codigoCiudad || req.body.codigoCiudad.length === 0) {
        _codigoCiudad = codigoBogota;
    } else {
        _codigoCiudad = req.body.codigoCiudad;
    }

    // Get data from body request
    let schedule = {
        puntoInicio: req.body.puntoInicio,
        puntoFinal: req.body.puntoFinal,
        esPagoConTarjeta: Boolean(req.body.esPagoConTarjeta),
        Nombres: req.body.Nombres,
        Apellidos: req.body.Apellidos,
        Telefono: req.body.Telefono,
        Celular: req.body.Celular,
        ValorDomicilio: req.body.ValorDomicilio,
        user_id: req.body.user_id,
        Descripcion: req.body.Descripcion ? req.body.Descripcion : null,
        
        TipoServicio: 'Domicilios',
        DescripcionDomicilio: req.body.DescripcionDomicilio,
        
        codigoCiudad: _codigoCiudad
    };

    if (!servicio_id){
        schedule.Estado = 'Pendiente';
        schedule.EnProceso= false;
    }

    const isQuote = req.body.EsCotizacion

    // Validate if Token is valid.
    const idToken = req.body.idToken
    const p_token = verifyAuth(idToken, schedule.user_id)

    // Validate if User has Permisssions
    const p_urlPermission = root.child(`/Administrativo/Usuarios/${schedule.user_id}/Rol`).once('value')
    const p_hasPermissions = p_urlPermission.then(response => {
        if (response.val() === Globals.ROLES.Cliente) {
            return Promise.resolve([])
        }
        return Promise.reject(new Error('Solo un cliente puede hacer una solicitud.'))
    })

    // Validate information from origins and destinations
    const p_loadData = ref.child(`/Administrativo/ParamsRegistro/Ciudades/${schedule.codigoCiudad}`)
        .once('value')
        .then(response => {
            if (!response || !response.val()) {
                return Promise.reject(new Error("No se tiene registro del codigo de ciudad indicado."))
            }

            const city = response.val()
            schedule.Ciudad = city.Nombre
            schedule.puntoInicio =  schedule.puntoInicio.replace(', '+city.Prefijo, '')
            schedule.puntoFinal =   schedule.puntoFinal.replace(', '+city.Prefijo, '')
            schedule.puntoInicio += ', ' + city.Prefijo
            schedule.puntoFinal += ', ' + city.Prefijo
            // Geocoding config
            const puntoInicio = encodeURIComponent(schedule.puntoInicio)
            const puntoFinal = encodeURIComponent(schedule.puntoFinal)
            const urlPuntoInical = apiGeocodingUrl(puntoInicio)
            const urlPuntoFinal = apiGeocodingUrl(puntoFinal)

            // Geocode puntoInicial
            const pic = rp(urlPuntoInical).then(response => {
                const _response = JSON.parse(response)
                const inicialCoors = _response.results[0].geometry.location
                schedule.puntoInicialCoors = inicialCoors.lat + ',' + inicialCoors.lng
                return Promise.resolve([])
            }).catch(err => {
                if (err) return Promise.reject(new Error('No se encontraron las coordenadas de la puntoInicio'))
            })

            // Geocode puntoFinal
            const pfc = rp(urlPuntoFinal).then(response => {
                const _response = JSON.parse(response)
                const finalCoors = _response.results[0].geometry.location
                schedule.puntoFinalCoors = finalCoors.lat + ',' + finalCoors.lng
                return Promise.resolve([])
            }).catch(err => {
                if (err) return Promise.reject(new Error('No se encontraron las coordenadas de la puntoFinal'));
            })

            return response = Promise.all([pic, pfc])
        })

    Promise.all([p_loadData, p_token, p_hasPermissions]).then(results => {
        // Matrix distance config
        const origins = schedule.puntoInicialCoors
        const destinations = schedule.puntoFinalCoors
        const urlIda = apiDistanceMatrixUrl(origins, destinations)
        const urlVuelta = apiDistanceMatrixUrl(destinations, origins)

        const optionsIda = { method: 'POST', uri: urlIda, json: true };
        const optionsVuelta = { method: 'POST', uri: urlVuelta, json: true };

        // Get Distance and duration Ida
        const pIda = rp.post(optionsIda).then(response => {
            schedule.distanciaIda = response.rows[0].elements[0].distance;
            schedule.duracionIda = response.rows[0].elements[0].duration;
            return Promise.resolve([])
        }).catch(err => {
            if (err) return Promise.reject(new Error('Falló el servicio para cargar la distancia y el tiempo de ida'))
        })

        if (schedule.esPagoConTarjeta === true) {
            // Get Distance and duration Vuelta
            const pVuelta = rp.post(optionsVuelta).then(response => {
                schedule.distanciaVuelta = response.rows[0].elements[0].distance;
                schedule.duracionVuelta = response.rows[0].elements[0].duration;
                return Promise.resolve([])
            }).catch(err => {
                if (err) return Promise.reject(new Error('Falló el servicio para cargar la distancia y el tiempo de Vuelta'))
            })
            return Promise.all([pIda, pVuelta])
        }
        return pIda

    }).then(() => {
        const scheduleType = schedule.scheduleType ? schedule.scheduleType : "Domicilios"
        const Ciudad = schedule.codigoCiudad
        const currentUserId = schedule.user_id;
        const refUserTarifas = ref.child(`/Administrativo/Usuarios/${currentUserId}/Tarifas/${Ciudad}/${scheduleType}/Tarifas`)
        return refUserTarifas.once('value').then((response) => {
            if (!response || !response.val()) {
                return ref.child(`/Administrativo/TipoServicio/${Ciudad}/${scheduleType}/Tarifas`).once('value')
            }
            return refUserTarifas.once('value')
        })
    }).then(response => {
        // Validate if we have service for the indicated city
        if (!response || !response.val()) return Promise.reject(new Error("No tenemos servicio para esa ciudad"))

        // Calculate full distance and total payment
        const sti_rate = response.val()
        const fullDistance = getFullDistance(schedule) * 1000
        const totalPayment = getTotalPayment(sti_rate, fullDistance)
        schedule.TotalAPagar = totalPayment
        schedule.DistanciaTotal = fullDistance
        return Promise.resolve([])
    }).then(() => {
        return ref.child(`/Administrativo/InfoRecargos`).once('value')
    }).then((response) => {
        const data = response.val();
        const hourBefore = data.Horas.AntesDe;
        const hourAfter = data.Horas.DespuesDe;
        const holidays = data.Festivos

        const day = date.getDay();
        const dayMonth = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const hour = date.getHours();
        const today = new Date(year, month, dayMonth).getTime();
        const bogotaHour = moment.tz(uid, "America/Bogota").format("H");
        const bogotaDayWeek = moment.tz(uid, "America/Bogota").day();
        const incrementAmount = () => {
            schedule.TotalAPagar += data.Monto
            return Promise.resolve([])
        }

        // Recargo Domingo
        if (bogotaDayWeek === 7) {
            console.log(`Aplicando recargo porque hoy es domingo`)
            return incrementAmount();
        }

        // Recargo Horas de noche o madrugada
        if (bogotaHour <= hourBefore || bogotaHour >= hourAfter) {
            console.log(`Aplicando recargo porque ${bogotaHour} es hora menor a ${hourBefore} o mayor a ${hourAfter}`)
            return incrementAmount();
        }

        // Recargo dias festivos
        if (holidays) {
            if (holidays[today]) {
                console.log(`Aplicando recargo por festivo ${holidays[today].Nombre}`)
                return incrementAmount();
            }
        }

        console.log(`No se aplico recargos`)
        return Promise.resolve([])
    }).then(() => {
        return ref.child(`/Administrativo/Ganancias`).once('value')
    }).then(response => {
        const profit = response.val()
        const messengerProfit = schedule.TotalAPagar * profit.Mensajero
        schedule.GananciaMensajero = messengerProfit
        return Promise.resolve([])
    }).then(() => {

        if (isQuote) return Promise.resolve([])
        schedule.EsActualizacion = servicio_id ? true : false;
        return refSchedule.update(schedule)
    }).then(() => {

        /* let firstNotification = new OneSignal.Notification({
            contents: {
                en: "Nuevo Servicio Pendiente",
                tr: "Hay un nuevo servicio pendiente"
            },
            subtitle: {
                en: "Nuevo Servicio Pendiente 2",
                tr: "Hay un nuevo servicio pendiente 2"
            }
        });
 
        firstNotification.setIncludedSegments(['All']);
 
        myClient.sendNotification(firstNotification, (err, httpResponse, data)=>{
            if (err) {
                console.log('Something went wrong on send notifications...');
            } else {
                console.log(data, httpResponse.statusCode);
            }
        }) */

        let message = isQuote ? 'Cotización Exitosa' : "servicio recibido"
        return res.status(200).type('application/json')
            .send({
                mensaje: message,
                status: 200,
                servicio_id: uid,
                servicio: formatSolicitud(schedule)
            })
    }).catch(err => {
        if (err) {
            console.log(`Error para solicitud id: ${uid} con motivo: ${err.message}`)
            return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear la solicitud.', error: err.message })
        }
    })
});

servicesRouter.get('/:user_id', (req, res) => {
    const user_id = req.params.user_id
    const idToken = req.query.idToken
    if (!idToken) {
        return res.status(400).type('application/json').send({ mensaje: 'El parametro idToken es obligatorio', error: "El parametro idToken es obligatorio" })
    }
    const p_idToken = verifyAuth(idToken, user_id)
        .then(() => {
            return ref.child('/Operativo/Solicitud')
                .orderByChild('user_id')
                .equalTo(user_id)
                .once('value')
        })
        .then(response => {
            let _services = response.val();
            console.log(response)

            _services = Object.keys(_services)
                .map(key => formatSolicitud(_services[key], key))
            res.status(400).type('application/json').send({ mensaje: _services })
            return 0
        })
        .catch(err => {
            if (err) {
                console.log(`Error Obtener solicitudes del usuario: ${user_id} con motivo: ${err.message}`)
                return res.status(400).type('application/json').send({ mensaje: 'No se pudo obtener la solicitud.', error: err.message })
            }
        })

})

servicesRouter.post('/festivo', (req, res) => {
    const { ano, mes, dia, descripcion } = req.body;
    const date = new Date(ano, mes, dia);
    const time = date.getTime();

    const action = ref.child(`/Administrativo/InfoRecargos/Festivos/${time}`).update({ Nombre: descripcion })
    action.then(response => {
        return res.status(200).type('application/json').send({ mensaje: "Exitoso" });
    }).catch(err => {
        if (err) {
            return res.status(400).type('application/json').send({ mensaje: 'No se pudo crear festivo.', error: err.message })
        }
    })
})

servicesRouter.get('/:user_id/:solicitud_id', (req, res) => {
    const user_id = req.params.user_id
    const solicitud_id = req.params.solicitud_id
    const idToken = req.query.idToken
    if (!idToken) {
        return res.status(400).type('application/json').send({ mensaje: 'El parametro idToken es obligatorio', error: "El parametro idToken es obligatorio" })
    }
    const p_idToken = verifyAuth(idToken, user_id)
        .then(() => {
            const services = ref.child(`/Operativo/Solicitud/${solicitud_id}`)
                .once('value')

            return services.then(snap => {
                let _service = snap.val()
                _service = formatSolicitud(_service)
                res.status(400).type('application/json').send({ mensaje: _service })
                return 0
            })
        })
        .catch(err => {
            if (err) {
                console.log(`Error Obtener solicidud: ${solicitud_id} del usuario: ${user_id} con motivo: ${err.message}`)
                return res.status(400).type('application/json').send({ mensaje: 'No se pudo obtener la solicitud.', error: err.message })
            }
        })

})


const formatSolicitud = (schedule, key = null) => {
    let answer = {
        puntoInicio: schedule.puntoInicio ? schedule.puntoInicio : '',
        puntoFinal: schedule.puntoFinal ? schedule.puntoFinal : '',
        esPagoConTarjeta: schedule.esPagoConTarjeta ? schedule.esPagoConTarjeta : false,
        Nombres: schedule.Nombres ? schedule.Nombres : '',
        Apellidos: schedule.Apellidos ? schedule.Apellidos : '',
        Celular: schedule.Celular ? schedule.Celular : '',
        user_id: schedule.user_id ? schedule.user_id : '',
        ValorDomicilio: schedule.ValorDomicilio ? schedule.ValorDomicilio : '',
        Estado: schedule.Estado ? schedule.Estado : '',
        puntoFinalCoors: schedule.puntoFinalCoors ? schedule.puntoFinalCoors : '',
        puntoInicialCoors: schedule.puntoInicialCoors ? schedule.puntoInicialCoors : '',
        TotalAPagar: schedule.TotalAPagar ? schedule.TotalAPagar : '',
        DistanciaTotal: schedule.DistanciaTotal ? schedule.DistanciaTotal : '',
        Descripcion: schedule.Descripcion ? schedule.Descripcion : '',
        DescripcionDomicilio: schedule.DescripcionDomicilio ? schedule.DescripcionDomicilio : '',
        Ciudad: schedule.Ciudad ? schedule.Ciudad : '',
    }
    if (schedule.motivoRechazo) {
        answer.motivoRechazo = schedule.motivoRechazo
    }

    if (key) {
        answer.service_id = key
    }

    return answer
}

const verifyAuth = (idToken, user_id) => {
    return admin.auth().verifyIdToken(idToken).then(res => {
        /* if (res.uid === user_id) {
            return Promise.resolve([])
        }
        return Promise.reject(new Error("No coincide el id del usuario")) */
        return Promise.resolve([])

    }).catch(err => {
        if (err) {
            return Promise.reject(new Error("Token no valido"))
        }
    })
}

const apiGeocodingUrl = (address) => {
    const _apiGeocodingUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    const KEY_GEOCODING = "AIzaSyBa-_VGSDZw9TinVFhVFo2lM4BQ_H0l194";
    return _apiGeocodingUrl + '?address=' + address + '&key=' + KEY_GEOCODING
}

const apiDistanceMatrixUrl = (origins, destinations) => {
    const apiDistanceMatrixUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";
    const API_KEY = "AIzaSyDjPraTx4A9TO4UMKgE24rAu2YANT4WjsM";
    return apiDistanceMatrixUrl +
        '?origins=' + origins +
        '&destinations=' + destinations +
        '&language=pt-PT' +
        '&key=' + API_KEY
}
exports.servicesRouter = servicesRouter
