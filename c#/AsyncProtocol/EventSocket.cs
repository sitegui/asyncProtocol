using System;
using System.Collections.Concurrent;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace Sitegui {
	/// <summary>
	/// An event-based class for tcp client sockets
	/// </summary>
	public class EventSocket : IDisposable {
		/// <summary>
		/// The pack sent to "data" event
		/// </summary>
		public class DataEventArgs : EventArgs {
			public byte[] Data { get; private set; }
			internal DataEventArgs(byte[] data) {
				Data = data;
			}
		}

		/// <summary>
		/// The pack sent to "error" event
		/// </summary>
		public class ExceptionEventArgs : EventArgs {
			public Exception Data { get; private set; }
			internal ExceptionEventArgs(Exception data) {
				Data = data;
			}
		}

		/// <summary>
		/// Indicate if the connection is open and ready for read and write operations
		/// </summary>
		public bool IsReady { get; private set; }

		// The client and stream
		TcpClient client;
		NetworkStream stream;

		// Indicate if this object has already been disposed
		bool disposed = false;

		// Background threads
		Thread readThread;
		Thread writeThread;

		// Pending buffers to write and sync flags
		ConcurrentQueue<byte[]> pendingBuffers = new ConcurrentQueue<byte[]>();
		ManualResetEvent hasPendingJob = new ManualResetEvent(false);
		ManualResetEvent hasDoneWritings = new ManualResetEvent(true);

		/// <summary>
		/// Fired when the connection is ready (executed in another thread)
		/// </summary>
		public event EventHandler OnConnect;

		/// <summary>
		/// Fired sequentially when data is received (executed in another thread)
		/// </summary>
		public event EventHandler<DataEventArgs> OnData;

		/// <summary>
		/// Fired when the connection has been closed (can be executed in another thread)
		/// </summary>
		public event EventHandler OnClose;

		/// <summary>
		/// Fired when something went wrong (executed in another thread).
		/// The connection will be closed if opened.
		/// If there is no registered listener to this event, the exeception will be rethrow
		/// </summary>
		public event EventHandler<ExceptionEventArgs> OnError;

		/// <summary>
		/// Create a new EventSocket and connect to the given host and port.
		/// Listen to "connect" event to know when the connection is made.
		/// Listen to "error" event to know if something went wrong.
		/// </summary>
		/// <param name="host">The host to connect to</param>
		/// <param name="port">The port to use</param>
		public EventSocket(string host, int port) {
			client = new TcpClient();
			client.BeginConnect(host, port, new AsyncCallback(EndConnect), client);
		}

		/// <summary>
		/// Send data to the server. If another data chunk is being sent, this chunk will be queued.
		/// </summary>
		/// <param name="data">The data to be sent</param>
		public void Write(byte[] data) {
			if (!IsReady)
				throw new Exception("Connection is not ready for Write()");
			pendingBuffers.Enqueue(data);
			hasPendingJob.Set();
			hasDoneWritings.Reset();
		}

		/// <summary>
		/// Send data to the server. If another data chunk is being sent, this chunk will be queued.
		/// </summary>
		/// <param name="data">The data to be sent</param>
		public void Write(string data) {
			Write(Encoding.UTF8.GetBytes(data));
		}

		/// <summary>
		/// End the connection, but wait for pending writes. Fire "close" event when the connection is closed.
		/// </summary>
		public void End() {
			if (IsReady) {
				IsReady = false;
				Thread thread = new Thread(new ThreadStart(RunCloseThread));
				thread.Start();
			}
		}

		/// <summary>
		/// End the connection, but wait for pending writes. Fire "close" event when the connection is closed.
		/// </summary>
		/// <param name="data">Last data to send</param>
		public void End(byte[] data) {
			Write(data);
			End();
		}

		/// <summary>
		/// End the connection, but wait for pending writes. Fire "close" event when the connection is closed.
		/// </summary>
		/// <param name="data">Last data to send</param>
		public void End(string data) {
			Write(data);
			End();
		}

		/// <summary>
		/// Dispose resources. You don't need to call this directly, instead use End()
		/// </summary>
		public void Dispose() {
			Dispose(true);
			GC.SuppressFinalize(this);
		}
		
		// Running thread to close after all pending writes are done
		void RunCloseThread() {
			// Wait for all the work in write thread
			hasDoneWritings.WaitOne();

			Dispose();
		}

		// Dispatch "error" event or throw (if there isn't any error listener registered)
		// Also dispose this object
		void DispatchError(Exception e) {
			try {
				if (OnError == null)
					throw e;
				OnError(this, new ExceptionEventArgs(e));
			} finally {
				Dispose(true);
			}
		}

		// Finish the connection
		void EndConnect(IAsyncResult ar) {
			try {
				client.EndConnect(ar);
				IsReady = true;
				stream = client.GetStream();

				// Start read thread
				readThread = new Thread(new ThreadStart(RunReadThread));
				readThread.IsBackground = true;
				readThread.Name = "EventSocket.readThread";
				readThread.Start();

				// Start write thread
				writeThread = new Thread(new ThreadStart(RunWriteThread));
				writeThread.IsBackground = true;
				writeThread.Name = "EventSocket.writeThread";
				writeThread.Start();

				// Fire "connect" event
				if (OnConnect != null)
					OnConnect(this, EventArgs.Empty);
			} catch (Exception e) {
				// Impossible to connect
				DispatchError(e);
			}
		}

		// Running thread to read data from stream
		void RunReadThread() {
			try {
				while (IsReady) {
					// Read more data (block until data arives or socket is closed)
					byte[] data = new byte[client.ReceiveBufferSize];
					int numBytes = stream.Read(data, 0, client.ReceiveBufferSize);
					if (numBytes == 0) {
						// Disconnected
						End();
						break;
					} else if (OnData != null) {
						// Data read
						byte[] trimmedData = new byte[numBytes];
						Array.Copy(data, trimmedData, numBytes);
						OnData(this, new DataEventArgs(trimmedData));
					}
				}
			} catch (Exception e) {
				if (IsReady)
					// Error during open connection
					DispatchError(e);
			}
		}

		// Running thread to write data to stream
		void RunWriteThread() {
			try {
				while (true) {
					// Wait for a write request
					hasPendingJob.WaitOne();

					// Pop data and reset flags
					byte[] data;
					if (pendingBuffers.TryDequeue(out data)) {
						if (pendingBuffers.Count == 0) {
							hasPendingJob.Reset();
							hasDoneWritings.Set();
						}

						// Send data (block until it's done)
						stream.Write(data, 0, data.Length);
					}
				}
			} catch (Exception e) {
				if (IsReady)
					// Error during open connection
					DispatchError(e);
			}
		}

		/// <summary>
		/// Dispose internal resources.
		/// </summary>
		/// <param name="disposing">Indicate whether internal resources should be disposed as well</param>
		protected virtual void Dispose(bool disposing) {
			if (!disposed) {
				disposed = true;
				IsReady = false;

				// Abort threads
				readThread.Abort();
				writeThread.Abort();

				// Dispose internal resources
				if (disposing) {
					if (stream != null)
						stream.Dispose();
					hasPendingJob.Dispose();
					hasDoneWritings.Dispose();
					client.Close();
				}
				stream = null;
				hasPendingJob = null;
				hasDoneWritings = null;
				client = null;

				// Fire "close" event
				if (OnClose != null)
					OnClose(this, EventArgs.Empty);
			}
		}

		// Dispose this object, but not internal resources
		~EventSocket() {
			Dispose(false);
		}
	}
}
