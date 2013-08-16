# asyncProtocol
An async, call-return-throw and message oriented protocol that sits above TCP

## For what?
This protocol is aimed for applications that need to trasmit a lot of structred data (like large arrays) from a client to a server.
Is has two models:

### Call-return
The client can "call" a function in the server and get the result (or an execption)

### Message
The cliente can say something to the server (with no response from the server side intended). The server can also say something to the client (with no response intended).

## Details
This is a light-weight protocol, that uses very little meta-data (when compared to JSON, for example). In order to do that, it requires that both endpoints (client and server) know the types of the arguments for each call/return/exception/message.

It's asynchronous protocol, so a client can send a message before a call has returned. Also, the server doesn't need to answer the calls in order.

## API
Initially, the API will be implemented in JavaScript (for Node.js). Afterwards, the client-side will be ported to JavaScript for browsers (with a WebSocket gate).
