// i18n translator server

const path = require('path')
const express = require('express')

const app = express()
app.disable('x-powered-by')

app.set('view cache', false)
app.set('view engine', 'pug')

app.use(require('method-override')())

const bodyParser = require('body-parser')
const limit = '500kb'
app.use(bodyParser.urlencoded({limit: limit, extended: true}))
app.use(bodyParser.json({limit: limit}))
app.use(express.static(__dirname + '/static'))

require('./route')(app)
app.all('*', (req, res) => res.sendStatus(404))

app.use(require('express-error-handler'))

const port = process.env.PORT || 80

app.listen(port)
console.info('Listening at http://localhost:' + port)
