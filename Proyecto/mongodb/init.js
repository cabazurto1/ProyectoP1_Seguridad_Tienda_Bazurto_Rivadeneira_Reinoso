db = db.getSiblingDB("organic_store");

db.createCollection("productos_imagenes");
db.createCollection("seo_marketing");
db.createCollection("chats");

db.productos_imagenes.insertMany([
  { producto_id: 1, url: "https://example.com/image1.jpg" },
  { producto_id: 2, url: "https://example.com/image2.jpg" }
]);

db.seo_marketing.insertOne({
  estrategia: "Optimización de palabras clave",
  descripción: "Aumentar la visibilidad en motores de búsqueda mediante keywords específicas."
});
