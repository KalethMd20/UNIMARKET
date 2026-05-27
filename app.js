const express = require('express')
const app = express()
const dotenv = require('dotenv')

// Carga variables de entorno (DB, JWT, puerto, etc.).
// seteamos las variables de entorno
dotenv.config({ path: './env/.env' })

const cookieParser = require('cookie-parser')
const session = require('express-session')

app.use(session({
    // Sesion para persistir datos temporales (ej: carrito).
    secret: 'unimarket_secret',
    resave: false,
    saveUninitialized: false
}))

// seteamos el motor de plantillas
app.set('view engine', 'ejs')

// seteamos la carpeta public para archivos estáticos
app.use(express.static('public'))

// para procesar datos enviados desde forms
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// para poder trabajar con las cookies
app.use(cookieParser())

// llamar al router
// Centraliza endpoints de auth, comprador, vendedor y admin.
app.use('/', require('./routes/router'))

// Para eliminar la cache
app.use(function(req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`SERVER UP running on port ${PORT}`);
});
