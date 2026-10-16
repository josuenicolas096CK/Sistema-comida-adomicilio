// Valores iniciales del restaurante; la API los comparte con el frontend.
// El servidor usa estos valores para calcular el total y validar el pago.
module.exports = Object.freeze({
    costo_envio: 15,
    estimacion_min_minutos: 45,
    estimacion_max_minutos: 60,
    metodos_pago: ['efectivo', 'transferencia']
});
