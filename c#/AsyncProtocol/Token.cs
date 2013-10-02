using System;
using System.Security.Cryptography;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent a Token (16-byte id)
	/// </summary>
	public class Token {
		/// <summary>
		/// Service provider for generating random bytes
		/// </summary>
		static RNGCryptoServiceProvider RNG = new RNGCryptoServiceProvider();

		/// <summary>
		/// Internal 16-byte array
		/// </summary>
		internal readonly byte[] Buffer;
		
		/// <summary>
		/// Create a new random Token
		/// </summary>
		public Token() {
			Buffer = new byte[16];
			RNG.GetBytes(Buffer);
		}

		/// <summary>
		/// Create a new clone for the given Token
		/// </summary>
		/// <param name="t">A Token to be cloned</param>
		public Token(Token t) {
			Buffer = new byte[16];
			Array.Copy(t.Buffer, Buffer, 16);
		}

		/// <summary>
		/// Create a new Token with the given buffer
		/// </summary>
		/// <param name="buffer">A byte-array with 16 bytes</param>
		internal Token(byte[] buffer) {
			if (buffer.Length != 16)
				throw new ArgumentException("Invalid buffer. It must contain 16 bytes");
			Buffer = new byte[16];
			Array.Copy(buffer, Buffer, 16);
		}

		/// <summary>
		/// Check if two Tokens are equal
		/// </summary>
		/// <param name="t">The Token to compare to this</param>
		/// <returns>Return true if both Token are equal</returns>
		public bool Equals(Token t) {
			if (t == null)
				return false;
			for (int i = 0; i < 16; i++)
				if (this.Buffer[i] != t.Buffer[i])
					return false;
			return true;
		}

		public override bool Equals(object obj) {
			return Equals(obj as Token);
		}
	}
}
