using System;
using System.Collections.Generic;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Store call and exception signatures
	/// </summary>
	public class Registry {
		/// <summary>
		/// Represent a registered call
		/// </summary>
		internal class RegisteredCall {
			public readonly uint Id;
			public readonly Format ArgsFormat;
			public readonly Format ReturnFormat;
			public readonly uint[] Exceptions;
			public RegisteredCall(uint id, string argsFormat, string returnFormat, uint[] exceptions) {
				Id = id;
				ArgsFormat = new Format(argsFormat);
				ReturnFormat = new Format(returnFormat);
				Exceptions = exceptions == null ? new uint[0] : exceptions;
			}

			public bool HasException(uint id) {
				for (int i = 0; i < Exceptions.Length; i++)
					if (Exceptions[i] == id)
						return true;
				return false;
			}
		}

		/// <summary>
		/// Represent a registered exception
		/// </summary>
		internal class RegisteredException {
			public readonly uint Id;
			public readonly Format DataFormat;
			public RegisteredException(uint id, string dataFormat) {
				Id = id;
				DataFormat = new Format(dataFormat);
			}
		}

		// Store all registered calls and exceptions
		static readonly List<RegisteredCall> RegisteredServerCalls = new List<RegisteredCall>();
		static readonly List<RegisteredCall> RegisteredClientCalls = new List<RegisteredCall>();
		static readonly List<RegisteredException> RegisteredExceptions = new List<RegisteredException>();

		/// <summary>
		/// Register a new type of call the server can make
		/// </summary>
		/// <param name="id">The unique id for this call</param>
		/// <param name="argsFormat">The string format for this call</param>
		/// <param name="returnFormat">The string format for the returned data</param>
		/// <param name="exceptions">An array of accepted exceptions to this call</param>
		/// <returns>Return the id (first parameter)</returns>
		public static uint RegisterServerCall(uint id, string argsFormat = "", string returnFormat = "", uint[] exceptions = null) {
			if (id == 0)
				throw new ArgumentException("id must be non-zero");
			if (GetServerCall(id) != null)
				throw new ArgumentException("Unable to register server call " + id + ", it has already been registered");
			RegisteredServerCalls.Add(new RegisteredCall(id, argsFormat, returnFormat, exceptions));
			return id;
		}
		
		/// <summary>
		/// Get the registered server call with the given id
		/// </summary>
		/// <param name="id">The id to search for</param>
		/// <returns>Return the found registered call or null</returns>
		internal static RegisteredCall GetServerCall(uint id) {
			return RegisteredServerCalls.Find((each) => { return each.Id == id; });
		}

		/// <summary>
		/// Register a new type of call the client can make
		/// </summary>
		/// <param name="id">The unique id for this call</param>
		/// <param name="argsFormat">The string format for this call</param>
		/// <param name="returnFormat">The string format for the returned data</param>
		/// <param name="exceptions">An array of accepted exceptions to this call</param>
		/// <returns>Return the id (first parameter)</returns>
		public static uint RegisterClientCall(uint id, string argsFormat = "", string returnFormat = "", uint[] exceptions = null) {
			if (id == 0)
				throw new ArgumentException("id must be non-zero");
			if (GetClientCall(id) != null)
				throw new ArgumentException("Unable to register client call " + id + ", it has already been registered");
			RegisteredClientCalls.Add(new RegisteredCall(id, argsFormat, returnFormat, exceptions));
			return id;
		}

		/// <summary>
		/// Get the registered client call with the given id
		/// </summary>
		/// <param name="id">The id to search for</param>
		/// <returns>Return the found registered call or null</returns>
		internal static RegisteredCall GetClientCall(uint id) {
			return RegisteredClientCalls.Find((each) => { return each.Id == id; });
		}

		/// <summary>
		/// Register a new type of exception that both server and client can answer and receive
		/// </summary>
		/// <param name="id">The unique id for this exception</param>
		/// <param name="dataFormat">The string format for this exception</param>
		/// <returns></returns>
		public static uint RegisterException(uint id, string dataFormat) {
			if (id == 0)
				throw new ArgumentException("id must be non-zero");
			if (GetException(id) != null)
				throw new ArgumentException("Unable to register exception " + id + ", it has already been registered");
			RegisteredExceptions.Add(new RegisteredException(id, dataFormat));
			return id;
		}

		/// <summary>
		/// Get the registered excpetion with the given id
		/// </summary>
		/// <param name="id">The id to search for</param>
		/// <returns>Return the found registered exception or null</returns>
		internal static RegisteredException GetException(uint id) {
			return RegisteredExceptions.Find((each) => { return each.Id == id; });
		}
	}
}
