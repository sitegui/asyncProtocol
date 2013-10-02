using System;
using System.Collections.Generic;
using System.Timers;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent an async-protocol connection
	/// </summary>
	public class Connection : IDisposable {
		/// <summary>
		/// Represent the object sent to "call" event
		/// </summary>
		public class CallEventArgs : EventArgs {
			/// <summary>
			/// The call type
			/// </summary>
			public uint Type { get { return Call.Id; } }

			/// <summary>
			/// The inflated data
			/// </summary>
			public readonly object Data;

			bool answered = false;
			Connection Conn;
			Registry.RegisteredCall Call;
			uint CallId;

			/// <summary>
			/// Create a new args bag
			/// </summary>
			/// <param name="type">The type of this call</param>
			/// <param name="data">The inflated data</param>
			/// <param name="conn">The connection that created this bag</param>
			/// <param name="call">The call definition</param>
			/// <param name="callId">The call sequence id</param>
			internal CallEventArgs(Registry.RegisteredCall call, object data, Connection conn, uint callId) {
				Data = data;
				Conn = conn;
				Call = call;
				CallId = callId;
			}

			/// <summary>
			/// Answer the call with an exception
			/// </summary>
			/// <param name="data">The exception to be sent</param>
			/// <returns>Return whether the answer was sent (false if the connection is closed)</returns>
			public bool Answer(CallException data) {
				return Answer(data.Type, data.Data);
			}

			/// <summary>
			/// Answer the call with an empty return
			/// </summary>
			/// <returns>Return whether the answer was sent (false if the connection is closed)</returns>
			public bool Answer() {
				return Answer(0, new Data());
			}

			/// <summary>
			/// Answer the call with a given return
			/// </summary>
			/// <param name="data">The data pack to send</param>
			/// <returns>Return whether the answer was sent (false if the connection is closed)</returns>
			public bool Answer(Data data) {
				return Answer(0, data);
			}

			/// <summary>
			/// Answer the call with a string
			/// </summary>
			/// <param name="data">The string to send</param>
			/// <returns>Return whether the answer was sent (false if the connection is closed)</returns>
			public bool Answer(string data) {
				return Answer(0, new Data(data));
			}

			/// <summary>
			/// Internal method to send the answer
			/// </summary>
			/// <param name="exceptionType">The exception type (0 means no exception, normal return instead)</param>
			/// <param name="data">The data pack to send</param>
			/// <returns>Return whether the answer was sent (false if the connection is closed)</returns>
			bool Answer(uint exceptionType, Data data) {
				// Validate the connection
				if (answered)
					throw new InvalidOperationException("Answer already sent");
				if (!Conn.IsReady)
					return false;
				
				// Validate the arguments
				if (exceptionType != 0) {
					if (!Call.HasException(exceptionType))
						throw new ArgumentException("Invalid exception " + exceptionType + " to call " + Call.Id);
				} else {
					if (data.Format != Call.ReturnFormat.FormatString)
						throw new ArgumentException("Invalid data type '" + data.Format + "' for return type " + Call.Id);
				}

				// Send the answer
				byte[] binData = data.GetBytes();
				byte[] binMeta = new Data().AddUint((ulong)0).AddInt(CallId).AddInt(exceptionType).GetBytes();
				byte[] binLength = new Data().AddUint((ulong)(binData.Length + binMeta.Length)).GetBytes();
				Conn.Socket.Write(binLength);
				Conn.Socket.Write(binMeta);
				Conn.Socket.Write(binData);
				answered = true;
				return true;
			}
		}

		/// <summary>
		/// Represent a client call waiting for an answer from the server
		/// </summary>
		class PendingCall {
			public uint CallId;
			public Registry.RegisteredCall Call;
			public ReturnDelegate OnReturn;
			public ExceptionDelegate OnException;
			public Timer Interval;

			public PendingCall(uint callId, Registry.RegisteredCall call, ReturnDelegate onReturn, ExceptionDelegate onException, Timer interval) {
				CallId = callId;
				Call = call;
				OnReturn = onReturn;
				OnException = onException;
				Interval = interval;
			}
		}

		/// <summary>
		/// Fired when the connection is ready
		/// </summary>
		public event EventHandler OnOpen;

		/// <summary>
		/// Fired when a server call arrives
		/// </summary>
		public event EventHandler<CallEventArgs> OnCall;

		/// <summary>
		/// Fired when the connection is closed (normally or due an protocol error)
		/// </summary>
		public event EventHandler OnClose;

		/// <summary>
		/// Fired when something went wrong.
		/// The connection will be closed if opened.
		/// If there is no registered listener to this event, the exeception will be rethrow
		/// </summary>
		public event EventHandler<EventSocket.ExceptionEventArgs> OnError;

		/// <summary>
		/// The delegate for "return" callback in Send()
		/// </summary>
		/// <param name="sender">This connection itself</param>
		/// <param name="data">The inflated data returned by the server</param>
		public delegate void ReturnDelegate(Connection sender, object data);

		/// <summary>
		/// The delegate for "exception" callback in Send()
		/// </summary>
		/// <param name="sender">This connection itself</param>
		/// <param name="type">The type of exception (0 means the call has timeouted, -1 means the connection was closed)</param>
		/// <param name="data">The inflated data returned by the server (null for type 0 and -1)</param>
		public delegate void ExceptionDelegate(Connection sender, int type, object data);

		/// <summary>
		/// Indicate whether this connection is ready to send and receive data
		/// </summary>
		public bool IsReady { get { return Socket != null && Socket.IsReady; } }

		EventSocket Socket;
		uint LastReceivedId;
		uint LastSentId;
		BufferView Cache = new BufferView();
		readonly LinkedList<PendingCall> PendingCalls = new LinkedList<PendingCall>();
		bool disposed = false;

		/// <summary>
		/// Create a new connection and start connecting
		/// </summary>
		/// <param name="host">The host to connect to</param>
		/// <param name="port">The port to use</param>
		public Connection(string host, int port) {
			Socket = new EventSocket(host, port);
			Socket.OnData += Socket_OnData;
			Socket.OnError += Socket_OnError;
			Socket.OnClose += Socket_OnClose;
			Socket.OnConnect += Socket_OnConnect;
			LastReceivedId = 0;
			LastSentId = 0;
		}

		/// <summary>
		/// Dispose resources. You don't need to call this directly, instead use End()
		/// </summary>
		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		/// <summary>
		/// Send a call to the server
		/// </summary>
		/// <param name="type">The call type (must have been registered with Registry.RegisterClientCall)</param>
		/// <param name="data">The data pack to send</param>
		/// <param name="onReturn">The callback to be executed when the server answers this call</param>
		/// <param name="onException">The callback to be executed when the server answer this call with an exception (or the call timeouts or the connection closes)</param>
		/// <param name="timeout">The timeout (in ms), 0 means no timeout</param>
		public void SendCall(uint type, Data data, ReturnDelegate onReturn = null, ExceptionDelegate onException = null, int timeout = 60000) {
			// Validate the data
			if (!IsReady)
				throw new InvalidOperationException("The connection has already been closed");
			Registry.RegisteredCall call = Registry.GetClientCall(type);
			if (call == null)
				throw new ArgumentException("Invalid call type " + type);
			if (data.Format != call.ArgsFormat.FormatString)
				throw new ArgumentException("Invalid data type '" + data.Format + "' for call " + type);

			// Create the meta-data
			byte[] binData = data.GetBytes();
			byte[] binMeta = new Data().AddUint(type).AddUint(++LastSentId).GetBytes();
			byte[] binLength = new Data().AddUint((ulong)(binData.Length + binMeta.Length)).GetBytes();

			// Send the call
			Socket.Write(binLength);
			Socket.Write(binMeta);
			Socket.Write(binData);

			// Set timeout
			Timer interval = null;
			if (timeout != 0) {
				interval = new Timer(timeout);
				interval.AutoReset = false;
				interval.Elapsed += TimeoutCallback;
				interval.Start();
			}

			// Save info about the sent call
			PendingCalls.AddLast(new PendingCall(LastSentId, call, onReturn, onException, interval));
		}

		/// <summary>
		/// Close the conection (after all writes in the underlying socket finish)
		/// </summary>
		public void End() {
			Socket.End();
		}

		void Socket_OnConnect(object sender, EventArgs e) {
			if (OnOpen != null)
				OnOpen(this, EventArgs.Empty);
		}

		void Socket_OnClose(object sender, EventArgs e) {
			// Alert all pending calls
			LinkedListNode<PendingCall> node = PendingCalls.First;
			while (node != null) {
				if (node.Value.Interval != null)
					node.Value.Interval.Stop();
				if (node.Value.OnException != null)
					node.Value.OnException(this, -1, null);
				node = node.Next;
			}
			PendingCalls.Clear();

			Dispose();

			// Emit "close" event
			if (OnClose != null)
				OnClose(this, EventArgs.Empty);
		}

		void Socket_OnError(object sender, EventSocket.ExceptionEventArgs e) {
			try {
				if (OnError == null)
					throw e.Data;
				OnError(this, e);
			} finally {
				Dispose(true);
			}
		}

		void Socket_OnData(object sender, EventSocket.DataEventArgs args) {
			// Store the data
			Cache.Concat(args.Data);

			// Try to read messages
			while (true) {
				int length;
				BufferView backup = new BufferView(Cache);

				try {
					// Extract the size of the message
					length = (int)InflateData.ReadUint(Cache);
				} catch (Exception e) {
					if (!(e is InflateData.NotEnoughData))
						ProtocolError();
					break;
				}

				if (Cache.Length < length) {
					Cache = backup;
					break;
				}

				ProcessMessage(Cache.ExtractSlice(length));
			}
		}

		void ProcessMessage(BufferView message) {
			uint type, callId;
			// Extract the message type and sequence id
			try {
				type = (uint)InflateData.ReadUint(message);
				callId = (uint)InflateData.ReadUint(message);
			} catch {
				ProtocolError();
				return;
			}
	
			if (type != 0)
				// A call from the other side
				ProcessCall(callId, type, message);
			else {
				try {
					type = (uint)InflateData.ReadUint(message);
				} catch {
					ProtocolError();
					return;
				}
				if (type != 0)
					// An exception from the other side
					ProcessException(callId, type, message);
				else
					// A return from the other side
					ProcessReturn(callId, message);
			}
		}

		void ProcessCall(uint callId, uint type, BufferView data) {
			object inflatedData;

			// Check the sequence id
			if (callId != ++LastReceivedId) {
				ProtocolError();
				return;
			}

			// Get call definition
			Registry.RegisteredCall call = Registry.GetServerCall(type);
			if (call == null) {
				ProtocolError();
				return;
			}

			// Read the incoming data
			try {
				inflatedData = InflateData.Inflate(data, call.ArgsFormat);
			} catch {
				ProtocolError();
				return;
			}

			// Emit the "call" event
			if (OnCall != null)
				OnCall(this, new CallEventArgs(call, inflatedData, this, callId));
		}

		void ProcessException(uint callId, uint type, BufferView data) {
			PendingCall callInfo = FetchPendingCall(callId);
			if (callInfo == null) {
				// Received a timeouted (or invalid) answer
				ProtocolError();
				return;
			}
			if (!callInfo.Call.HasException(type)) {
				// Received an invalid exception type
				ProtocolError();
				return;
			}

			// Get exception definition
			Registry.RegisteredException exception = Registry.GetException(type);
			if (exception == null) {
				ProtocolError();
				return;
			}

			// Read the incoming data
			object inflatedData;
			try {
				inflatedData = InflateData.Inflate(data, exception.DataFormat);
			} catch {
				ProtocolError();
				return;
			}

			// Clear the timeout
			if (callInfo.Interval != null)
				callInfo.Interval.Stop();

			// Call the callback
			if (callInfo.OnException != null)
				callInfo.OnException(this, (int)type, inflatedData);
		}

		void ProcessReturn(uint callId, BufferView data) {
			PendingCall callInfo = FetchPendingCall(callId);
			if (callInfo == null) {
				// Received a timeouted (or invalid) answer
				ProtocolError();
				return;
			}

			// Read the incoming data
			object inflatedData;
			try {
				inflatedData = InflateData.Inflate(data, callInfo.Call.ReturnFormat);
			} catch {
				ProtocolError();
				return;
			}

			// Clear the timeout
			if (callInfo.Interval != null)
				callInfo.Interval.Stop();

			// Call the callback
			if (callInfo.OnReturn != null)
				callInfo.OnReturn(this, inflatedData);
		}

		PendingCall FetchPendingCall(uint callId) {
			LinkedListNode<PendingCall> node = PendingCalls.First;
			while (node != null) {
				if (node.Value.CallId == callId) {
					PendingCalls.Remove(node);
					return node.Value;
				}
				node = node.Next;
			}
			return null;
		}

		PendingCall FetchPendingCall(Timer interval) {
			LinkedListNode<PendingCall> node = PendingCalls.First;
			while (node != null) {
				if (node.Value.Interval == interval) {
					PendingCalls.Remove(node);
					return node.Value;
				}
				node = node.Next;
			}
			return null;
		}

		void ProtocolError() {
			End();
		}

		protected virtual void Dispose(bool disposing) {
			if (!disposed) {
				disposed = true;
				if (disposing)
					Socket.Dispose();
				Socket = null;
			}
		}

		void TimeoutCallback(object sender, ElapsedEventArgs e) {
			PendingCall callInfo = FetchPendingCall((Timer)sender);
			if (callInfo != null) {
				if (callInfo.OnException != null)
					callInfo.OnException(this, 0, null);
			}
		}

		~Connection() {
			Dispose(false);
		}
	}
}
