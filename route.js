// routers
const fs = require('fs')
const path = require('path')
const through2 = require('through2')
const _ = require('lodash')
const chokidar = require('chokidar')

const dir_locals = path.resolve(__dirname, process.env.DIR || '/locales')
const def_locale = process.env.DEFAULT || 'en_US'
let indent

const streams = new Set()
const boradcast = data => streams.forEach(res => {
  return res.write('data: ' + JSON.stringify(data) + '\n\n')
})

//
const xx = (str, type) => {
  const key = '.json'
  str = str.replace(key, '')
  if (type) str += key
  return str
}

// Locale Keys
const LOCALES = []
const getFiles = (force) => {
  return new Promise((resolve, reject) => {
    // cache
    // if (LOCALES.length && !force) return resolve(LOCALES)
    fs.readdir(dir_locals, (err, files) => {
      files || ( files = [] )
      LOCALES.length = 0
      ;[].push.apply(LOCALES, files.map(k => xx(k)).filter(k => !/^\./.test(k)))
      resolve(LOCALES)
    })
  })
}

const filePath = lang => path.join(dir_locals, xx(lang, 1))

// Locale Objects
const LOCALE = {
  // zh_CN: {}
}
const loadFile = (lang, fromWatch) => {
  let _path = filePath(lang)
  return new Promise((resolve, reject) => {
    fs.readFile(_path, {encoding: 'utf8'}, (err, cnt) => {
      if (err || !cnt) cnt = '{}'
      // guess indent
      if (!indent) {
        let matched = cnt.match(/^\{[\r\n]*?(.*?)\"/) || []
        indent = matched[1] || '  '
      }
      let data
      try {
        data = JSON.parse(cnt)
      } catch(e) {
        reject(e)
        return
      }
      // merge
      if (!LOCALE[lang]) {
        LOCALE[lang] = data
        resolve(data)
      } else {
        const changed = {cache: {}, file: {}, del: []}
        const cache = LOCALE[lang]
        // Diff and merge base on file
        const cacheKeys = Object.keys(cache)
        const fileKeys = Object.keys(data)
        fileKeys.forEach(k => {
          let v = data[k]
          if (v === cache[k]) return
          // new cache key
          if (!cache.hasOwnProperty(k)) return changed.cache[k] = cache[k] = v
          // value is different
          // direction is `file to cache` when file changed
          if (fromWatch)
            changed.cache[k] = cache[k] = data[k]
          // direction is `cache to file`
          else
            changed.file[k] = data[k] = cache[k]
        })
        // Auto fill default lang keys
        // `del` means delete key in all files
        if (lang === def_locale) {
          cacheKeys.forEach(k => {
            if (!data.hasOwnProperty(k)) {
              if (fromWatch) {
                delete cache[k]
                changed.del.push(k)
              }
              else
                changed.file[k] = data[k] = k
            }
          })
          // dump all files
          if (changed.del.length) {
            boradcast({
              type: 'del',
              lang,
              keys: changed.del
            })
            LOCALES.forEach(_lang => {
              if (_lang === def_locale) return
              changed.del.forEach(k => {
                delete LOCALE[_lang][k]
              })
              if (lang === _lang)
                dump(_lang, LOCALE[_lang]).then(resolve, reject)
              else
                dump(_lang, LOCALE[_lang])
            })
            return
          }
        }
        // Auto align keys with default
        if (lang !== def_locale && cacheKeys.length !== Object.keys(LOCALE[def_locale]).length) {
          const align = (src, target) => {
            let found = cacheKeys.filter(k => {
              if (!LOCALE[src].hasOwnProperty(k)) return LOCALE[src][k] = k
            })
            // merge back and trigger watch events
            if (found.length) loadFile(src)
          }
          align(def_locale, lang)
          align(lang, def_locale)
        }
        // auto delete obsolete keys
        // if (cacheKeys > fileKeys) {
        //   cacheKeys.forEach()
        // }
        const changedFileKeys = Object.keys(changed.file)
        const changedCacheKeys = Object.keys(changed.cache)

        // equal
        if (!changedFileKeys.length && !changedCacheKeys.length) return resolve()

        if (changedCacheKeys.length || changedFileKeys.length) {
          boradcast({
            type: 'put',
            lang,
            keys: Object.assign(changed.file, changed.cache)
          })
        }
        //
        if (!changedFileKeys.length) return resolve()
        // dump to file
        dump(lang, cache).then(resolve, reject)
      }
    })
  })
}

const sequence = {}
const dump = (lang, json)=> {
  let _path = filePath(lang)
  sequence[_path] || (sequence[_path] = {lock: false, data: []})
  if (json) sequence[_path].data.push(JSON.stringify(json, null, indent))

  const promise = new Promise((resolve, reject) => {
    if (sequence[_path].lock) return resolve('ok')
    sequence[_path].lock = true
    fs.writeFile(_path, sequence[_path].data.shift(), err => {
      sequence[_path].lock = false
      if (sequence[_path].data.length) dump(_path)
      if (err) {
        reject(err)
        console.error(err)
      } else {
        resolve('ok')
        console.info('Dump', lang, 'ok.')
      }
    })
  })
  return promise
}

const init = () => {
  getFiles().then(locales => {
    locales.forEach(key => {
      loadFile(key)
    })
  })
}

init()

// Watch files changes
chokidar.watch(dir_locals, { ignoreInitial: true, usePolling: true })
  .on('change', (fullname) => loadFile(xx(path.basename(fullname)), true))

const log = (req, lang, key, old, val) => {
  const now = new Date()
  const fname = [now.getUTCFullYear(), now.getMonth(), now.getDate()].join('')
  const logFile = path.resolve(__dirname, './static/logs/useredit-'+ fname +'.md')
  fs.appendFile(logFile, [
    new Date().toISOString(),
    '__' + lang + '__',
    '`' + key + '`',
    ': ',
    '`' + old + '`',
    '->',
    '`' + val + '`',
    req.ip
  ].join(' ') + '\n')
}

module.exports = app => {

  app.get('/', (req, res) => {
    res.render('index', {LOCALES, LOCALE})
  })

  app.post('/', (req, res) => {
    res.json({def: def_locale, data: LOCALE})
  })

  app.put('/', (req, res) => {
    const data = req.body || {}
    const k = data.k
    const v = data.v
    const l = data.l
    if (!l || !k || !v) return res.status(599).send('Bad params')
    const _path = filePath(l)
    // write to cache
    const old = LOCALE[l][k]
    if (old === v) res.send('ok')
    LOCALE[l][k] = v
    // dump to file
    loadFile(l)
      .then(() => {
        res.send('ok')
        log(req, l, k, old, v)
      })
      .catch(() => res.status(599).send('file write error'))
  })

  //
  app.get('/stream', (req, res) => {

    res.writeHead(200, {'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive'})
    res.write('retry: 10000\n')
    // add to connections
    streams.add(res)
    let timer = setInterval(() => res.write(': \n\n'), 20000)
    // remove
    req.connection.addListener('close', () => {
      clearInterval(timer)
      streams.delete(res)
    }, false)

  })
}
