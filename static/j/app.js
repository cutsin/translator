var langMap = {
  en_US: 'English',
  de_DE: 'Deutsch',
  es_ES: 'Español',
  ja_JP: '日本語',
  ru_RU: 'русский',
  th_TH: 'ไทย',
  zh_CN: '中文(简体)'
}

const headers = {'Content-Type': 'application/json'}

var app = new Vue({
  el: '#app',
  data () {
    return {
      langMap,
      def: '',
      locale: {},
      current: {l: '', k: '', v: ''},
      pendings: {},
      modified: {},
      deleted: {},
      origin: false
    }
  },
  computed: {
    locales () {
      return Object.keys(this.locale).filter(k => k !== this.def).sort()
    },
    total () {
      if (!this.def) return {}
      const res = {}
      const langs = [this.def].concat(this.locales)
      langs.forEach(lang => {
        res[lang] = Object.keys(this.locale[lang]).length
      })
      return res
    }
  },
  methods: {
    // show/hide origin key
    sh () {
      this.origin = !this.origin
    },
    merge (src, force) {
      if (force) {
        Object.assign(this.locale, src)
        this.locale = Object.assign({}, this.locale)
      } else {
        for(lang in src) {
          var keys = src[lang]
          for(key in keys) {
            this.locale[lang][key] = keys[key]
          }
        }
      }
      this.locale = Object.assign({}, this.locale)
    },
    update (cb) {
      fetch('/', {method: 'POST'}).then(response => {
        response.json()
          .then(res => {
            this.def = res.def
            this.merge(res.data, true)
          })
      })
    },
    old (l, k, v) {
      this.current.l = l
      this.current.k = k
      this.current.v = v
    },
    put (l, k, v) {
      var pendingKey = l + '.' + k
      if (this.current.l == l && this.current.k == k && this.current.v == v) return
      this.pendings[pendingKey] = 1
      this.pendings = Object.assign({}, this.pendings)
      fetch('/', {method: 'PUT', headers, body: JSON.stringify({l, k, v})})
        .then(() => {
          this.pendings[pendingKey] = 2
          setTimeout(() => {
            delete this.pendings[pendingKey]
            this.pendings = Object.assign({}, this.pendings)
          }, 5000)
        })
        .catch(() => {
          this.pendings[pendingKey] = 3
        })
    },
    listen () {
      (new EventSource('/stream'))
        .addEventListener('message', evt => {
          const data = JSON.parse(evt.data)
          const keys = data.keys
          const lang = data.lang
          // delete keys
          if (data.type === 'del') {
            const langs = [this.def].concat(this.locales)
            keys.forEach(k => {
              langs.forEach(lang => {
                if (this.locale[lang][k]) delete this.locale[lang][k]
              })
            })
            this.locale = Object.assign({}, this.locale)
            return
          }
          // Modify keys
          if (data.type !== 'put') return
          this.merge({
            [lang]: keys
          })
          const modified = Object.keys(keys)
          modified.forEach(k => {
            this.modified[lang + '.' + k] = true
          })
          this.modified = Object.assign({}, this.modified)
          setTimeout(() => {
            modified.forEach(k => {
              delete this.modified[lang + '.' + k]
            })
            this.modified = Object.assign({}, this.modified)
          }, 5000)
        })
    }
  },
  created () {
    this.update()
    this.listen()
  }
})
