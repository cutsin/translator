# I18n Translator

## Docker

### Build Image

```bash
docker build --force-rm -t translator-image .
```

### Run

```bash
cd Your_locales_folder
docker run --privileged -dit -p 0.0.0.0:3018:80 -v ${PWD}:/locales --name translator1 translator-image
```

### Visit

`http://127.0.0.1:3018`
