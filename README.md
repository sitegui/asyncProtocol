# asyncProtocol
An async, call-return-throw oriented protocol that sits above TCP

## For what?
This protocol is aimed for applications that need to transmit a lot of structured data (like large arrays) from a client to a server.

The client can "call" a function in the server and get the result (or an exception).

## Details
This is a light-weight protocol that uses very little meta-data (when compared to JSON, for example). In order to do that, it requires that both endpoints (client and server) know the types of the arguments for each call/return/exception.

It's asynchronous protocol, so a client can send a message before a call has returned. Also, the server doesn't need to answer the calls in order.

## API
Initially, the API will be implemented in JavaScript (for Node.js). Afterwards, the client-side will be ported to JavaScript for browsers (with a WebSocket gate).
