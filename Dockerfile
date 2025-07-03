FROM nginx:alpine
USER root
COPY ./dist/build/h5/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]