FROM alpine

RUN \
	apk add --no-cache git nodejs nodejs-npm \
	&& mkdir /locales \
	&& git clone https://github.com/cutsin/translator.git /srv \
	# node packages
	&& cd /srv/translator && npm i \
	&& npm i --quiet --global pm2 \
	&& npm cache clean

CMD ["pm2", "start", "app.js", "-i", "1"]

EXPOSE 80
