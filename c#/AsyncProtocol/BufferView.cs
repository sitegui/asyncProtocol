using System;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent a view to a byte array.
	/// Efficiently avoid copying buffers everywhere
	/// </summary>
	internal class BufferView {
		/// <summary>
		/// Number of visible bytes
		/// </summary>
		public int Length { get; private set; }

		/// <summary>
		/// Internal reference to underlying byte array
		/// </summary>
		byte[] Buffer;

		/// <summary>
		/// Number of ignored bytes in the beginning of the array
		/// </summary>
		int Offset;

		/// <summary>
		/// Create a new view for a slice of the given buffer
		/// </summary>
		/// <param name="buffer">The buffer as a byte array</param>
		/// <param name="offset">Where to start the view</param>
		/// <param name="length">The length of the view</param>
		public BufferView(byte[] buffer, int offset, int length) {
			if (offset < 0 || length < 0 || offset + length > buffer.Length)
				throw new ArgumentException("Invalid offset and length for this buffer");
			Buffer = buffer;
			Offset = offset;
			Length = length;
		}

		/// <summary>
		/// Create a new empty view
		/// </summary>
		public BufferView() : this(new byte[0], 0, 0) { }

		/// <summary>
		/// Create a new view for the given buffer
		/// </summary>
		/// <param name="buffer">The buffer as a byte array</param>
		public BufferView(byte[] buffer) : this(buffer, 0, buffer.Length) { }

		/// <summary>
		/// Clone a given view
		/// </summary>
		/// <param name="buffer">The old object to clone</param>
		public BufferView(BufferView buffer) : this(buffer.Buffer, buffer.Offset, buffer.Length) { }

		/// <summary>
		/// Access a given byte
		/// </summary>
		/// <param name="i">The index of the desired byte</param>
		/// <returns>Return the byte at the given virtual position</returns>
		public byte this[int i] {
			get {
				if (i < 0 || i >= Length)
					throw new IndexOutOfRangeException();
				return Buffer[Offset + i];
			}
		}

		/// <summary>
		/// Concat more data to this view. Implicitly free unused space
		/// </summary>
		/// <param name="data">The buffer to be added</param>
		public void Concat(byte[] data) {
			byte[] r = new byte[Length + data.Length];
			Array.Copy(Buffer, Offset, r, 0, Length);
			Array.Copy(data, 0, r, Length, data.Length);
			Buffer = r;
			Offset = 0;
			Length = r.Length;
		}

		/// <summary>
		/// Remove initial bytes from the view
		/// </summary>
		/// <param name="start">The number of bytes to remove</param>
		public void Slice(int start) {
			if (start < 0 || start > Length)
				throw new ArgumentException("Invalid start");
			Offset += start;
			Length -= start;
		}

		/// <summary>
		/// Return the initial bytes as a byte array
		/// </summary>
		/// <param name="size">The number of bytes to read</param>
		/// <returns>Return a byte array populated with the requested data</returns>
		public byte[] GetBytes(int size) {
			if (size < 0 || size > Length)
				throw new ArgumentException("Invalid size");
			byte[] buffer = new byte[size];
			Array.Copy(Buffer, Offset, buffer, 0, size);
			return buffer;
		}

		/// <summary>
		/// Extract initial bytes from this view
		/// </summary>
		/// <param name="size">The number of bytes to extract</param>
		/// <returns>Return a new BufferView with the desired number of bytes</returns>
		public BufferView ExtractSlice(int size) {
			if (size < 0 || size > Length)
				throw new ArgumentException("Invalid size");
			BufferView r = new BufferView(Buffer, Offset, size);
			Offset += size;
			Length -= size;
			return r;
		}
	}
}
