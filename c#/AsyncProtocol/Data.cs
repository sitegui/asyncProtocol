using System;
using System.Text;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent a pack of data, that will be sent to the server
	/// </summary>
	public class Data {
		/// <summary>
		/// The internal byte-array (read-only)
		/// </summary>
		internal readonly DataBuffer Buffer = new DataBuffer();
		
		/// <summary>
		/// The format string of the data
		/// </summary>
		public string Format { get; private set; }

		// Constants
		internal const ulong MAX_UINT_1_B = 0x80;
		internal const ulong MAX_UINT_2_B = 0x4000;
		internal const ulong MAX_UINT_3_B = 0x200000;
		internal const ulong MAX_UINT_4_B = 0x10000000;
		internal const ulong MAX_UINT_5_B = 0x800000000;
		internal const ulong MAX_UINT_6_B = 0x40000000000;
		internal const ulong MAX_UINT_7_B = 0x2000000000000;
		internal const ulong MAX_UINT_8_B = 0x100000000000000;
		internal const long MIN_INT_1_B = -0x40;
		internal const long MIN_INT_2_B = -0x2000;
		internal const long MIN_INT_3_B = -0x100000;
		internal const long MIN_INT_4_B = -0x8000000;
		internal const long MIN_INT_5_B = -0x400000000;
		internal const long MIN_INT_6_B = -0x20000000000;
		internal const long MIN_INT_7_B = -0x1000000000000;
		internal const long MIN_INT_8_B = -0x80000000000000;
		internal const byte OFFSET_1_B = 0x00;
		internal const byte OFFSET_2_B = 0x80;
		internal const byte OFFSET_3_B = 0xC0;
		internal const byte OFFSET_4_B = 0xE0;
		internal const byte OFFSET_5_B = 0xF0;
		internal const byte OFFSET_6_B = 0xF8;
		internal const byte OFFSET_7_B = 0xFC;
		internal const byte OFFSET_8_B = 0xFE;
		internal const byte MASK_1_B = 0x01;
		internal const byte MASK_2_B = 0x03;
		internal const byte MASK_3_B = 0x07;
		internal const byte MASK_4_B = 0x0F;
		internal const byte MASK_5_B = 0x1F;
		internal const byte MASK_6_B = 0x3F;
		internal const byte MASK_7_B = 0x7F;
		internal const byte MASK_8_B = 0xFF;

		/// <summary>
		/// Create a new empty data pack
		/// </summary>
		public Data() { }

		/// <summary>
		/// Create a new data pack and append a string
		/// </summary>
		/// <param name="s">The string to be appended</param>
		public Data(string s) {
			AddString(s);
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="u">An unsigned integer</param>
		/// <returns>Return itself</returns>
		public Data AddUint(ulong u) {
			// Validates the input
			if (u >= Data.MAX_UINT_8_B)
				throw new ArgumentOutOfRangeException("Expected a value lower than 2^56");

			// First byte
			if (u < Data.MAX_UINT_1_B) {
				Buffer.Append((byte)(Data.OFFSET_1_B + (u & Data.MASK_7_B)));
				u = 0;
			} else if (u < Data.MAX_UINT_2_B) {
				Buffer.Append((byte)(Data.OFFSET_2_B + (u & Data.MASK_6_B)));
				u >>= 6;
			} else if (u < Data.MAX_UINT_3_B) {
				Buffer.Append((byte)(Data.OFFSET_3_B + (u & Data.MASK_5_B)));
				u >>= 5;
			} else if (u < Data.MAX_UINT_4_B) {
				Buffer.Append((byte)(Data.OFFSET_4_B + (u & Data.MASK_4_B)));
				u >>= 4;
			} else if (u < Data.MAX_UINT_5_B) {
				Buffer.Append((byte)(Data.OFFSET_5_B + (u & Data.MASK_3_B)));
				u >>= 3;
			} else if (u < Data.MAX_UINT_6_B) {
				Buffer.Append((byte)(Data.OFFSET_6_B + (u & Data.MASK_2_B)));
				u >>= 2;
			} else if (u < Data.MAX_UINT_7_B) {
				Buffer.Append((byte)(Data.OFFSET_7_B + (u & Data.MASK_1_B)));
				u >>= 1;
			} else {
				Buffer.Append(Data.OFFSET_8_B);
			}
	
			// Other bytes
			while (u != 0) {
				Buffer.Append((byte)u);
				u >>= 8;
			}

			Format += "u";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="i">A signed integer</param>
		/// <returns>Return itself</returns>
		public Data AddInt(long i) {
			int length;
	
			// Validates the input
			if (i < Data.MIN_INT_8_B || i >= -Data.MIN_INT_8_B)
				throw new ArgumentOutOfRangeException("Expected a value between -2^55 and 2^55-1");
	
			// First byte
			if (i >= Data.MIN_INT_1_B && i < -Data.MIN_INT_1_B) {
				i -= Data.MIN_INT_1_B;
				Buffer.Append((byte)(Data.OFFSET_1_B + (i & Data.MASK_7_B)));
				i = 0;
				length = 0;
			} else if (i >= Data.MIN_INT_2_B && i < -Data.MIN_INT_2_B) {
				i -= Data.MIN_INT_2_B;
				Buffer.Append((byte)(Data.OFFSET_2_B + (i & Data.MASK_6_B)));
				i >>= 6;
				length = 1;
			} else if (i >= Data.MIN_INT_3_B && i < -Data.MIN_INT_3_B) {
				i -= Data.MIN_INT_3_B;
				Buffer.Append((byte)(Data.OFFSET_3_B + (i & Data.MASK_5_B)));
				i >>= 5;
				length = 2;
			} else if (i >= Data.MIN_INT_4_B && i < -Data.MIN_INT_4_B) {
				i -= Data.MIN_INT_4_B;
				Buffer.Append((byte)(Data.OFFSET_4_B + (i & Data.MASK_4_B)));
				i >>= 4;
				length = 3;
			} else if (i >= Data.MIN_INT_5_B && i < -Data.MIN_INT_5_B) {
				i -= Data.MIN_INT_5_B;
				Buffer.Append((byte)(Data.OFFSET_5_B + (i & Data.MASK_3_B)));
				i >>= 3;
				length = 4;
			} else if (i >= Data.MIN_INT_6_B && i < -Data.MIN_INT_6_B) {
				i -= Data.MIN_INT_6_B;
				Buffer.Append((byte)(Data.OFFSET_6_B + (i & Data.MASK_2_B)));
				i >>= 2;
				length = 5;
			} else if (i >= Data.MIN_INT_7_B && i < -Data.MIN_INT_7_B) {
				i -= Data.MIN_INT_7_B;
				Buffer.Append((byte)(Data.OFFSET_7_B + (i & Data.MASK_1_B)));
				i >>= 1;
				length = 6;
			} else {
				i -= Data.MIN_INT_8_B;
				Buffer.Append(Data.OFFSET_8_B);
				length = 7;
			}
	
			// Other bytes
			while (length != 0) {
				Buffer.Append((byte)i);
				i >>= 8;
				length--;
			}

			Format += "i";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="f">A float</param>
		/// <returns>Return itself</returns>
		public Data AddFloat(float f) {
			byte[] data = BitConverter.GetBytes(f);
			if (!BitConverter.IsLittleEndian)
				Array.Reverse(data);
			Buffer.Append(data);
			Format += "f";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="t">A Token instance</param>
		/// <returns>Return itself</returns>
		public Data AddToken(Token t) {
			Buffer.Append(t.Buffer);
			Format += "t";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="s">A string</param>
		/// <returns>Return itself</returns>
		public Data AddString(string s) {
			string format = Format;
			byte[] data = Encoding.UTF8.GetBytes(s);
			AddUint((ulong)data.Length);
			Buffer.Append(data);
			Format = format + "s";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="a">An array of Data object as a DataArray object</param>
		/// <returns>Return itself</returns>
		public Data AddDataArray(DataArray a) {
			string format = Format;
			AddUint((ulong)a.Length);
			Buffer.Append(a.Buffer);
			Format = format + "(" + a.Format + ")";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="data">Another Data object</param>
		/// <returns>Return itself</returns>
		public Data AddData(Data data) {
			Buffer.Append(data.Buffer);
			Format += data.Format;
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="array">An array of unsigned integers</param>
		/// <returns>Return itself</returns>
		public Data AddUintArray(ulong[] array) {
			string format = Format;
			AddUint((ulong)array.Length);
			for (int i = 0; i < array.Length; i++)
				AddUint(array[i]);
			Format = format + "(u)";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="array">An array of signed integers</param>
		/// <returns>Return itself</returns>
		public Data AddIntArray(long[] array) {
			string format = Format;
			AddUint((ulong)array.Length);
			for (int i = 0; i < array.Length; i++)
				AddInt(array[i]);
			Format = format + "(i)";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="array">An array of floats</param>
		/// <returns>Return itself</returns>
		public Data AddFloatArray(float[] array) {
			string format = Format;
			AddUint((ulong)array.Length);
			for (int i = 0; i < array.Length; i++)
				AddFloat(array[i]);
			Format = format + "(f)";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="array">An array of Token instances</param>
		/// <returns>Return itself</returns>
		public Data AddTokenArray(Token[] array) {
			string format = Format;
			AddUint((ulong)array.Length);
			for (int i = 0; i < array.Length; i++)
				AddToken(array[i]);
			Format = format + "(t)";
			return this;
		}

		/// <summary>
		/// Append something to the Data object
		/// </summary>
		/// <param name="array">An array of strings</param>
		/// <returns>Return itself</returns>
		public Data AddStringArray(string[] array) {
			string format = Format;
			AddUint((ulong)array.Length);
			for (int i = 0; i < array.Length; i++)
				AddString(array[i]);
			Format = format + "(s)";
			return this;
		}

		/// <summary>
		/// Get all encoded data as an array of bytes
		/// </summary>
		/// <returns>Return the byte array</returns>
		public byte[] GetBytes() {
			return Buffer.GetBytes();
		}
	}
}
