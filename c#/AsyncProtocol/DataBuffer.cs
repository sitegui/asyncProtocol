using System;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// An auto-resizable array for storing binary data
	/// </summary>
	internal class DataBuffer {
		/// <summary>
		/// The internal byte-array for storing all the data
		/// </summary>
		byte[] Buffer;

		/// <summary>
		/// The current number of used bytes in the internal byte-array
		/// </summary>
		int Length = 0;

		/// <summary>
		/// Create a new buffer with the given initial size
		/// </summary>
		/// <param name="length">Number of bytes initially allocated (default: 128)</param>
		public DataBuffer(int length=128) {
			Buffer = new byte[length];
		}

		/// <summary>
		/// Append something to the buffer. Resizes automatically if needed
		/// </summary>
		/// <param name="data">Another DataBuffer instance</param>
		public void Append(DataBuffer data) {
			Alloc(data.Length);
			Array.Copy(data.Buffer, 0, Buffer, Length, data.Length);
			Length += data.Length;
		}

		/// <summary>
		/// Append something to the buffer. Resizes automatically if needed
		/// </summary>
		/// <param name="b">One single byte</param>
		public void Append(byte b) {
			Alloc(1);
			Buffer[Length] = b;
			Length++;
		}

		/// <summary>
		/// Append something to the buffer. Resizes automatically if needed
		/// </summary>
		/// <param name="data">An array of bytes</param>
		public void Append(byte[] data) {
			Alloc(data.Length);
			Array.Copy(data, 0, Buffer, Length, data.Length);
			Length += data.Length;
		}

		/// <summary>
		/// Get this buffer as an array of bytes
		/// </summary>
		/// <returns>Return the byte array</returns>
		public byte[] GetBytes() {
			byte[] r = new byte[Length];
			Array.Copy(Buffer, r, Length);
			return r;
		}

		/// <summary>
		/// Make sure there is at least the given amout of free space. Resize the internal array if needed
		/// </summary>
		/// <param name="amount">The number of free bytes needed</param>
		void Alloc(int amount) {
			while (Length + amount > Buffer.Length) {
				byte[] newBuffer = new byte[Buffer.Length*2];
				Array.Copy(Buffer, newBuffer, Buffer.Length);
				Buffer = newBuffer;
			}
		}
    }
}
