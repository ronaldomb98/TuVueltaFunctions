const functions = require('firebase-functions');
const express = require('express')
const app = express();
const servicesApi = require('./api/services/services.js')
const holidaysApi = require('./api/holidays/holidays.js')
const reportsApi = require('./api/reportes/reportes.js')
const cors = require('cors');
const rp = require('request-promise');
app.use(cors());

// Add default Configuration
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp(functions.config().firebase)
}

// Trigger
exports.newCreditoRetiro = functions.database
    .ref('/Operativo/Logs/CreditosMensajero/CreditoRetiro/{userId}/{date}')
    .onCreate(event => {
        const _creditoRetiro = event.data.val()
        const root = event.data.ref.root
        const userId = event.params.userId
        const GncUser = root.child(`/Operativo/Logs/GananciasMensjero/${userId}`)
        const dgu_primse = GncUser.once('value')
        console.log("Se ha creado un nuevo log de ganancia mensajero")
        return dgu_primse.then(snap => {
            const _data = snap.val()
            console.log(_data)
            let totalCrdtsR = _creditoRetiro.GananciaMensajero;
            if (_data && _data.CreditosRetiro) {
                totalCrdtsR += _data.CreditosRetiro
            }
            return GncUser.update({
                CreditosRetiro: totalCrdtsR
            })
        })
    })
exports.deleteCreditoRetiro = functions.database
    .ref('/Operativo/Logs/CreditosMensajero/CreditoRetiro/{userId}/{date}')
    .onDelete(event => {
        const _creditoRetiro = event.data.previous.val()
        const root = event.data.ref.root
        const { userId, date } = event.params
        const GncUser = root.child(`/Operativo/Logs/GananciasMensjero/${userId}`)
        const dgu_primse = GncUser.once('value')
        console.log(`Se ha borrado un log de ganancia del mensajero ${userId} date ${date}`)
        console.log(JSON.stringify(_creditoRetiro))
        return dgu_primse.then(snap => {
            const _data = snap.val()
            console.log(_data)
            let totalCrdtsR = _data.CreditosRetiro - _creditoRetiro.GananciaMensajero;
            return GncUser.update({
                CreditosRetiro: totalCrdtsR
            })
        })
    })
exports.relanzamiento = functions.database
    .ref('/Operativo/Logs/CreditosMensajero/Relanzamientos/{userId}/{date}')
    .onCreate(event => {
        const _relanzamiento = event.data.val()
        const root = event.data.ref.root
        const userId = event.params.userId
        const GncUser = root.child(`/Operativo/Logs/GananciasMensjero/${userId}`)
        const dgu_primse = GncUser.once('value')
        console.log("Se ha creado un nuevo log de ganancia mensajero")
        return dgu_primse.then(snap => {
            const _data = snap.val()
            console.log(_data)
            let totalCrdtsR = 0
            totalCrdtsR -= _relanzamiento.GananciaMensajero;
            totalCrdtsR -= _relanzamiento.Multa;
            if (_data && _data.CreditosRetiro) {
                totalCrdtsR += _data.CreditosRetiro
            }
            return GncUser.update({
                CreditosRetiro: totalCrdtsR
            })
        })
    })

exports.retiros = functions.database
    .ref('/Operativo/Logs/CreditosMensajero/Retiros/{userId}/{date}')
    .onCreate(event => {
        const _relanzamiento = event.data.val()
        const root = event.data.ref.root
        const userId = event.params.userId
        const GncUser = root.child(`/Operativo/Logs/GananciasMensjero/${userId}`)
        const dgu_primse = GncUser.once('value')
        console.log("Se ha creado un nuevo log de ganancia mensajero")
        return dgu_primse.then(snap => {
            const _data = snap.val()
            console.log(_data)
            let totalCrdtsR = 0
            totalCrdtsR -= _relanzamiento.MontoARetirar;
            if (_data && _data.CreditosRetiro) {
                totalCrdtsR += _data.CreditosRetiro
            }
            return GncUser.update({
                CreditosRetiro: totalCrdtsR
            })
        })
    })
exports.integratorLogSolicitud = functions.database
    .ref('/Operativo/Logs/Solicitud/{serviceId}/{date}')
    .onCreate(event => {
        const { Estado, Motorratoner_id } = event.data.val()
        const { serviceId, date } = event.params
        const root = event.data.ref.root

        let userId = "";
        let options = {
            method: 'POST',
            json: true,
            body: {
                Estado: Estado,
                Fecha: date,
                ServicioId: serviceId
            }
        };
        const p_service = root.child(`/Operativo/Solicitud/${serviceId}`).once('value')
        return p_service.then(response => {
            const { user_id } = response.val()
            userId = user_id;
            return root.child(`/Administrativo/Usuarios/${user_id}/ClienteIntegracion`).once("value")
        }).then(response => {
            if (response.val()) {
                const { urls } = response.val()
                options.uri = urls.logSolicitud
                return root.child(`/Administrativo/Usuarios/${Motorratoner_id}`).once("value")
            }
            return Promise.reject(new Error(`El usuario ${userId} no tiene URLs de integración`))
        }).then(response => {
            const { PlacaVehiculo, Nombres, Celular } = response.val()
            options.body.NombreMensajero = Nombres;
            options.body.PlacaVehiculo = PlacaVehiculo;
            options.body.Celular = Celular;
            console.log(options)
            return rp.post(options)
        }).then(response => {
            console.log(JSON.stringify(response))
            return 0
        })
    })

exports.reallocateSolicitud = functions.database
    .ref('/Operativo/Solicitud/{solicitudId}')
    .onUpdate(event => {

        const {
            Reasignando,
            PrevioMotorratoner_id,
            Motorratoner_id,
            fechaCompra,
            NuevaFechaCompra,
            BonoRelanzamiento,
            EsActualizacion
        } = event.data.val();

        const { solicitudId } = event.params;
        const root = event.data.ref.root;

        if (Reasignando && PrevioMotorratoner_id) {
            // Do Reasignacion
            console.log("Ejecutando re asignacion")
            // pr = Promise Remove 
            const pr_CreditoMensajero = root.child(`/Operativo/Logs/CreditosMensajero/CreditoRetiro/${PrevioMotorratoner_id}/${fechaCompra}`).remove();
            // pu = Promise update
            const pu_LogReasignacion = pr_CreditoMensajero.then(response => {
                return root.child(`/Operativo/Logs/Reasignaciones/${solicitudId}/${NuevaFechaCompra}`).update({
                    PrevioMotorratoner_id: PrevioMotorratoner_id,
                    NewMotorratoner_id: Motorratoner_id
                })
            })
            const pu_ref = pu_LogReasignacion.then(response => {

                return event.data.ref.update({
                    Reasignando: false,
                    fechaCompra: NuevaFechaCompra,
                    NuevaFechaCompra: null
                })
            })

            return pu_ref.then(response => {
                const pu_creditoRetiro = root.child(`/Operativo/Logs/CreditosMensajero/CreditoRetiro/${Motorratoner_id}/${NuevaFechaCompra}`)
                let GananciaMensajero = event.data.val().GananciaMensajero;
                if (BonoRelanzamiento) {
                    GananciaMensajero += BonoRelanzamiento;
                }
                return pu_creditoRetiro.update({
                    GananciaMensajero: GananciaMensajero,
                    servicio_id: solicitudId
                })
            })
        } else if (EsActualizacion) {
            if (Motorratoner_id) {
                console.log(`Actualizando servicio y actualizando ganancia mensajero Fecha Compra: ${fechaCompra}`)
                const newFechaCompra = fechaCompra + 1;
                pr_CreditoMensajero = root.child(`/Operativo/Logs/CreditosMensajero/CreditoRetiro/${Motorratoner_id}/${fechaCompra}`).remove();
                const pu_creditoRetiro = pr_CreditoMensajero.then(() => {

                    console.log(`Nueva fecha compra: ${newFechaCompra}`)
                    const pu_creditoRetiro = root.child(`/Operativo/Logs/CreditosMensajero/CreditoRetiro/${Motorratoner_id}/${newFechaCompra}`)
                    let GananciaMensajero = event.data.val().GananciaMensajero;
                    if (BonoRelanzamiento) {
                        GananciaMensajero += BonoRelanzamiento;
                    }

                    return setTimeout(() => {
                        return pu_creditoRetiro.update({
                            GananciaMensajero: GananciaMensajero,
                            servicio_id: solicitudId
                        }).then(() => {
                            return event.data.ref.update({
                                EsActualizacion: false,
                                fechaCompra: newFechaCompra
                            })
                        }).catch(err => {
                            if (err) {
                                console.log(err.message)
                            }
                        })
                    }, 10000);
                })
            }
            return 0
        }
        return 0
    })
// Add headers
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.use('/holiday', holidaysApi.holidaysRouter)
app.use('/solicitudes', servicesApi.servicesRouter)
app.use('/reportes', reportsApi.reportsRouter)
exports.api = functions.https.onRequest(app)