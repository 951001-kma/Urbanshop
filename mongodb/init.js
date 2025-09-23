db.createUser({
    user: "urbanuser",
    pwd: "urbanpass",
    roles: [{
        role: "readWrite",
        db: "urbanshop"
    }]
});

db.products.insertMany([
    {
        name: "Producto Ejemplo 1",
        price: 29.99,
        category: "electronics",
        image: "product1.jpg",
        stock: 10,
        createdAt: new Date()
    },
    {
        name: "Producto Ejemplo 2", 
        price: 49.99,
        category: "clothing",
        image: "product2.jpg",
        stock: 5,
        createdAt: new Date()
    }
]);