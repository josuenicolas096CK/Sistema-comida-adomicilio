const trackingApi = location.port === '3002' ? '/api' : 'http://127.0.0.1:3002/api';
const trackingForm = document.getElementById('tracking-form');
const trackingNumber = document.getElementById('tracking-number');
const trackingMessage = document.getElementById('tracking-message');
const trackingResult = document.getElementById('tracking-result');
const trackingButton = document.getElementById('tracking-submit');
const trackingStates = {
    pendiente: { label: 'Pedido recibido', step: 0 },
    en_preparacion: { label: 'En preparación', step: 1 },
    entregado: { label: 'Entregado', step: 2 }
};

trackingForm.addEventListener('submit', async event => {
    event.preventDefault();
    trackingResult.hidden = true;
    trackingMessage.hidden = true;
    const match = /^(?:#?LBM-)?([1-9]\d*)$/i.exec(trackingNumber.value.trim());
    if (!match || !Number.isSafeInteger(Number(match[1]))) {
        trackingMessage.textContent = 'Escribe un número válido, por ejemplo #LBM-123 o 123.';
        trackingMessage.hidden = false;
        return;
    }

    trackingButton.disabled = true;
    trackingButton.textContent = 'Consultando…';
    try {
        const response = await fetch(`${trackingApi}/seguimiento/${match[1]}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo consultar el pedido.');
        const state = trackingStates[data.estado];
        if (!state) throw new Error('El estado de esta orden no está disponible.');
        document.getElementById('tracking-order').textContent = `#LBM-${data.pedido_id}`;
        document.getElementById('tracking-status').textContent = state.label;
        trackingResult.querySelectorAll('.tracker-step').forEach((step, index) => {
            step.classList.toggle('completed', index < state.step);
            step.classList.toggle('active', index === state.step);
            if (index === state.step) step.setAttribute('aria-current', 'step');
            else step.removeAttribute('aria-current');
        });
        trackingResult.querySelector('.tracker-progress-bar').style.width = `${state.step * 33.3}%`;
        trackingResult.hidden = false;
    } catch (error) {
        trackingMessage.textContent = error.message || 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
        trackingMessage.hidden = false;
    } finally {
        trackingButton.disabled = false;
        trackingButton.textContent = 'Consultar estado';
    }
});
