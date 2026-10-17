
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf

COPY index.html login.html payment.html signup.html /usr/share/nginx/html/
COPY style.css script.js logo.jpg /usr/share/nginx/html/

RUN printf 'OK\n' > /usr/share/nginx/html/health

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
