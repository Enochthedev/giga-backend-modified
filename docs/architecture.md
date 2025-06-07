# Architecture

```
[user-service] --HTTP--> [taxi_main] --HTTP--> [payment-service]
        |                                     ^
        |                                     |
        +----HTTP----> [taxi_driver] ----------+

[ecommerce] --HTTP--> [payment-service]
[advertisement] --events--> [ecommerce]
[hotel-service] --HTTP--> [payment-service]
```

All services share a PostgreSQL database. Events like `ORDER_CREATED` and `RIDE_REQUESTED` are published through RabbitMQ.
