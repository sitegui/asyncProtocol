using System;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// A builder for an array of Data objects
	/// </summary>
	public class DataArray {
		/// <summary>
		/// The string format of every Data element (read-only)
		/// </summary>
		public readonly string Format;

		/// <summary>
		/// The number of Data elements
		/// </summary>
		public int Length { get; private set; }

		/// <summary>
		/// The internal byte array
		/// </summary>
		internal DataBuffer Buffer = new DataBuffer();

		/// <summary>
		/// Create a new builder for Data objects with the given format
		/// </summary>
		/// <param name="format">A format string of all Data objects</param>
		public DataArray(string format) {
			Format = format;
		}

		/// <summary>
		/// Append another Data object to this array
		/// </summary>
		/// <param name="data">The object do append</param>
		/// <returns>Return itself</returns>
		public DataArray AddData(Data data) {
			if (Format != data.Format)
				throw new FormatException("Data element must match the DataArray format: '" + data.Format + "' was given, '" + Format + "' was expected");
			Buffer.Append(data.Buffer);
			Length++;
			return this;
		}
	}
}
