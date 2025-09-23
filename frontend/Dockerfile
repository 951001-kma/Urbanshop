FROM nginx:alpine

# Copiar archivos estáticos
COPY public/ /usr/share/nginx/html/

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]