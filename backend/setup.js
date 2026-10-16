const fs = require('node:fs');
const path = require('node:path');

const destination = path.join(__dirname, '.env');
if (fs.existsSync(destination)) {
    console.log('Se conserva backend/.env existente.');
} else {
    fs.copyFileSync(path.join(__dirname, '.env.example'), destination);
    console.log('Se creó backend/.env con valores de ejemplo para XAMPP (root sin contraseña).');
    console.log('Si tu MySQL usa otras credenciales, edita backend/.env antes de arrancar.');
}
