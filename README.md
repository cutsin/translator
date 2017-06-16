# I18n Translator

## Docker

### Build Image

```bash
docker build --force-rm -t translator-image .
```

### Create Container

```bash
cd /Your_locales_folder
docker run --privileged -dit -p 127.0.0.1:3018:80 -v ${PWD}:/locales --name Your_locales_name translator-image
```



## In Docker

### Install

```bash
npm i
```

### Run

```bash
cp .config.js pm2.json
git clone your_project.git /srv/
# vi ./pm2.json
# change `DIR` to `/srv/your_project/.../locales/`
pm2 start app.js -i 1
```


### Visit (on your browser)

`http://127.0.0.1:3018`
