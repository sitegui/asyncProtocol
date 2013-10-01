using System;
using System.Collections;
using System.Text;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Static class to inflate protocol-enconded data into c# data
	/// </summary>
	static class InflateData {
		/// <summary>
		/// Inflate the data with the given format stored in a buffer
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <param name="format">An inflated format object</param>
		/// <returns>Return null, an ArrayList or a single value (ulong, long, float, Token or string)</returns>
		internal static object Inflate(BufferView buffer, Format format) {
			ArrayList data = new ArrayList();
			if (InflateData.ReadElement(buffer, data, format.Root).Length != 0)
				throw new ArgumentException("Unable to read data in the given format");
			return data.Count == 0 ? null : (data.Count == 1 ? data[0] : data);
		}

		/// <summary>
		/// Exception to flag there wasn't enough bytes in the view to extract the data
		/// </summary>
		[SerializableAttribute]
		internal class NotEnoughData : Exception {
			public NotEnoughData(string message) : base(message) { }
		}

		/// <summary>
		/// Extract a single element from the view
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <param name="data">The data ArrayList to store the extracted data</param>
		/// <param name="format">The format of the data to be extracted</param>
		/// <returns>Return the view parameter</returns>
		static BufferView ReadElement(BufferView buffer, ArrayList data, Format.ElementsArray format) {
			for (int i = 0; i < format.Elements.Count; i++) {
				switch (format.Elements[i].ElementType) {
					case Format.Element.Type.ARRAY:
						data.Add(ReadArray(buffer, (Format.ElementsArray)format.Elements[i]));
						break;
					case Format.Element.Type.UINT:
						data.Add(ReadUint(buffer));
						break;
					case Format.Element.Type.INT:
						data.Add(ReadInt(buffer));
						break;
					case Format.Element.Type.FLOAT:
						data.Add(ReadFloat(buffer));
						break;
					case Format.Element.Type.TOKEN:
						data.Add(ReadToken(buffer));
						break;
					case Format.Element.Type.STRING:
						data.Add(ReadString(buffer));
						break;
				}
			}
			return buffer;
		}

		/// <summary>
		/// Extract an unsigned integer
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <returns>Return the extracted data</returns>
		internal static ulong ReadUint(BufferView buffer) {
			byte firstByte;
			int length, shifts;
			ulong u;

			// Get the first byte
			if (buffer.Length == 0)
				throw new NotEnoughData("Unable to extract unsigned integer");
			firstByte = buffer[0];

			// Get the total length and the first bits
			if (firstByte < Data.OFFSET_2_B) {
				// Fast path
				buffer.Slice(1);
				return (ulong)firstByte;
			} else if (firstByte < Data.OFFSET_3_B) {
				length = 1;
				u = (ulong)(firstByte & Data.MASK_6_B);
			} else if (firstByte < Data.OFFSET_4_B) {
				length = 2;
				u = (ulong)(firstByte & Data.MASK_5_B);
			} else if (firstByte < Data.OFFSET_5_B) {
				length = 3;
				u = (ulong)(firstByte & Data.MASK_4_B);
			} else if (firstByte < Data.OFFSET_6_B) {
				length = 4;
				u = (ulong)(firstByte & Data.MASK_3_B);
			} else if (firstByte < Data.OFFSET_7_B) {
				length = 5;
				u = (ulong)(firstByte & Data.MASK_2_B);
			} else if (firstByte < Data.OFFSET_8_B) {
				length = 6;
				u = (ulong)(firstByte & Data.MASK_1_B);
			} else if (firstByte == Data.OFFSET_8_B) {
				length = 7;
				u = 0;
			} else
				throw new InvalidOperationException("Unable to extract unsigned integer");

			// Get the remaining bytes
			if (buffer.Length <= length)
				throw new NotEnoughData("Unable to extract unsigned integer");
			shifts = 7 - length;
			for (int i = 1; i <= length; i++) {
				ulong temp = buffer[i];
				u += temp << shifts;
				shifts += 8;
			}

			buffer.Slice(length + 1);
			return u;
		}

		/// <summary>
		/// Extract a signed integer
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <returns>Return the extracted data</returns>
		static long ReadInt(BufferView buffer) {
			byte firstByte;
			long i;
			int length, shifts;

			// Get the first byte
			if (buffer.Length == 0)
				throw new NotEnoughData("Unable to extract signed integer");
			firstByte = buffer[0];

			// Get the total length and the first bits
			if (firstByte < Data.OFFSET_2_B) {
				// Fast path
				buffer.Slice(1);
				return (long)firstByte + Data.MIN_INT_1_B;
			} else if (firstByte < Data.OFFSET_3_B) {
				length = 1;
				i = (long)(firstByte & Data.MASK_6_B) + Data.MIN_INT_2_B;
			} else if (firstByte < Data.OFFSET_4_B) {
				length = 2;
				i = (long)(firstByte & Data.MASK_5_B) + Data.MIN_INT_3_B;
			} else if (firstByte < Data.OFFSET_5_B) {
				length = 3;
				i = (long)(firstByte & Data.MASK_4_B) + Data.MIN_INT_4_B;
			} else if (firstByte < Data.OFFSET_6_B) {
				length = 4;
				i = (long)(firstByte & Data.MASK_3_B) + Data.MIN_INT_5_B;
			} else if (firstByte < Data.OFFSET_7_B) {
				length = 5;
				i = (long)(firstByte & Data.MASK_2_B) + Data.MIN_INT_6_B;
			} else if (firstByte < Data.OFFSET_8_B) {
				length = 6;
				i = (long)(firstByte & Data.MASK_1_B) + Data.MIN_INT_7_B;
			} else if (firstByte == Data.OFFSET_8_B) {
				length = 7;
				i = Data.MIN_INT_8_B;
			} else
				throw new InvalidOperationException("Unable to extract signed integer");

			// Get the remaining bytes
			if (buffer.Length <= length)
				throw new NotEnoughData("Unable to extract signed integer");
			shifts = 7 - length;
			for (int j = 1; j <= length; j++) {
				long temp = buffer[j];
				i += temp << shifts;
				shifts += 8;
			}

			buffer.Slice(length + 1);
			return i;
		}

		/// <summary>
		/// Extract a float
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <returns>Return the extracted data</returns>
		static float ReadFloat(BufferView buffer) {
			if (buffer.Length < 4)
				throw new NotEnoughData("Unable to extract float");
			byte[] temp = buffer.GetBytes(4);
			if (!BitConverter.IsLittleEndian)
				Array.Reverse(temp);
			buffer.Slice(4);
			return BitConverter.ToSingle(temp, 0);
		}

		/// <summary>
		/// Extract a Token
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <returns>Return the extracted data</returns>
		static Token ReadToken(BufferView buffer) {
			if (buffer.Length < 16)
				throw new NotEnoughData("Unable to extract Token");
			Token r = new Token(buffer.GetBytes(16));
			buffer.Slice(16);
			return r;
		}

		/// <summary>
		/// Extract a string
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <returns>Return the extracted data</returns>
		static string ReadString(BufferView buffer) {
			int length;

			// Get the string length
			length = (int)ReadUint(buffer);

			if (buffer.Length < length)
				throw new NotEnoughData("Unable to extract string");

			string r = Encoding.UTF8.GetString(buffer.GetBytes(length));
			buffer.Slice(length);
			return r;
		}

		/// <summary>
		/// Extract an array
		/// </summary>
		/// <param name="buffer">A view with the encoded data</param>
		/// <param name="format">A component of an inflated format object</param>
		/// <returns>Return the extracted data</returns>
		static ArrayList ReadArray(BufferView buffer, Format.ElementsArray format) {
			int length;

			// Get the number of elements
			length = (int)ReadUint(buffer);

			// Extract each element
			ArrayList array = new ArrayList();
			if (format.Elements.Count == 1)
				for (int i = 0; i < length; i++)
					ReadElement(buffer, array, format);
			else
				for (int i = 0; i < length; i++) {
					ArrayList subArray = new ArrayList();
					ReadElement(buffer, subArray, format);
					array.Add(subArray);
				}

			return array;
		}
	}
}
