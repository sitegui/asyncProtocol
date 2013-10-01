using System;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent an exception returned by a call sent to the server
	/// </summary>
	public class CallException {
		/// <summary>
		/// Create a new exception. It must be declared in the Registry
		/// </summary>
		/// <param name="type">The type of the exception</param>
		/// <param name="data">The data pack</param>
		public CallException(uint type, Data data) {
			// Validate the exception type
			Registry.RegisteredException entry = Registry.GetException(type);
			if (entry == null)
				throw new ArgumentException("Invalid exception type " + type);

			// Validate the data format
			if (data.Format != entry.DataFormat.FormatString)
				throw new ArgumentException("Invalid data type '" + data.Format + "' for exception " + type);

			Type = type;
			Data = data;
		}

		/// <summary>
		/// Create a new exception with empty data. It must be declared in the Registry
		/// </summary>
		/// <param name="type">The type of the exception</param>
		public CallException(uint type) : this(type, new Data()) { }

		/// <summary>
		/// Create a new exception. It must be declared in the Registry
		/// </summary>
		/// <param name="type">The type of the exception</param>
		/// <param name="data">The string to add as the data</param>
		public CallException(uint type, string data) : this(type, new Data(data)) { }

		/// <summary>
		/// The type of this exception
		/// </summary>
		internal readonly uint Type;

		/// <summary>
		/// The data pack
		/// </summary>
		internal readonly Data Data;
	}
}
