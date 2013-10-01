using System;
using System.Collections;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Sitegui.AsyncProtocol.Test {
	[TestClass]
	public class DataTest {
		[TestMethod]
		public void TestUint() {
			ulong[] values = new ulong[] {
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
			0x7F, 0x80, 0x81,
			0x4000-1, 0x4000, 0x4001,
			0x200000-1, 0x200000, 0x200001,
			0x10000000-1, 0x10000000, 0x10000001,
			0x800000000-1, 0x800000000, 0x800000001,
			0x40000000000-1, 0x40000000000, 0x40000000001,
			0x2000000000000-1, 0x2000000000000, 0x2000000000001
			};

			Data pack = new Data();
			pack.Append(values);
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(u)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < inflated.Count; i++)
				Assert.AreEqual<ulong>(values[i], (ulong)inflated[i]);
		}

		[TestMethod]
		public void TestInt() {
			long[] values = new long[] {
			0, -1, 1, -2, 2, -3, 3,
			-0x40-1, -0x40, -0x40+1, 0x40-1, 0x40, 0x40+1,
			-0x2000-1, -0x2000, -0x2000+1, 0x2000-1, 0x2000, 0x2000+1,
			-0x100000-1, -0x100000, -0x100000+1, 0x100000-1, 0x100000, 0x100000+1,
			-0x8000000-1, -0x8000000, -0x8000000+1, 0x8000000-1, 0x8000000, 0x8000000+1,
			-0x400000000-1, -0x400000000, -0x400000000+1, 0x400000000-1, 0x400000000, 0x400000000+1,
			-0x20000000000-1, -0x20000000000, -0x20000000000+1, 0x20000000000-1, 0x20000000000, 0x20000000000+1,
			-0x1000000000000-1, -0x1000000000000, -0x1000000000000+1, 0x1000000000000-1, 0x1000000000000, 0x1000000000000+1,
			-0x80000000000000, -0x80000000000000+1, 0x80000000000000-1
			};

			Data pack = new Data();
			pack.Append(values);
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(i)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < inflated.Count; i++)
				Assert.AreEqual<long>(values[i], (long)inflated[i]);
		}

		[TestMethod]
		public void TestFloat() {
			float[] values = new float[] {
			1, -1, 3.14f, 2.7f, 1.4142f, -1.2345f
			};

			Data pack = new Data();
			pack.Append(values);
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(f)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < inflated.Count; i++)
				Assert.AreEqual<float>(values[i], (float)inflated[i]);
		}

		[TestMethod]
		public void TestToken() {
			Token[] values = new Token[] {
			new Token(), new Token(), new Token(), new Token()
			};

			Data pack = new Data();
			pack.Append(values);
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(t)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < inflated.Count; i++)
				Assert.IsTrue(values[i].Equals((Token)inflated[i]));
		}

		[TestMethod]
		public void TestString() {
			string[] values = new string[] {
			"", "HI", "áçêñtòs", new string('x', 100000)
			};

			Data pack = new Data();
			pack.Append(values);
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(s)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < inflated.Count; i++)
				Assert.IsTrue(values[i] == (string)inflated[i]);
		}

		[TestMethod]
		public void TestAll() {
			Data pack = new Data();
			pack.Append((ulong)17);
			pack.Append((long)-12);
			pack.Append(3.1415f);
			byte[] binToken = new byte[] {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16};
			Token token = new Token(binToken);
			pack.Append(token);
			pack.Append("Hello, world");
			byte[] data = pack.GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("uifts");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			Assert.AreEqual<ulong>(17, (ulong)inflated[0]);
			Assert.AreEqual<long>(-12, (long)inflated[1]);
			Assert.AreEqual<float>(3.1415f, (float)inflated[2]);
			Assert.IsTrue(token.Equals((Token)inflated[3]));
			Assert.AreEqual<string>("Hello, world", (string)inflated[4]);
		}

		[TestMethod]
		public void TestBigArray() {
			Random rand = new Random();
			ulong[] uints = new ulong[1000];
			float[] floats = new float[1000];
			DataArray pack = new DataArray("uf");
			for (int i = 0; i < 1000; i++) {
				uints[i] = (ulong)rand.Next();
				floats[i] = (float)rand.NextDouble();
				pack.Append(new Data().Append(uints[i]).Append(floats[i]));
			}
			byte[] data = new Data().Append(pack).GetBytes();

			BufferView buffer = new BufferView(data, 0, data.Length);
			Format format = new Format("(uf)");
			ArrayList inflated = (ArrayList)InflateData.Inflate(buffer, format);

			for (int i = 0; i < 1000; i++) {
				ArrayList each = (ArrayList)inflated[i];
				ulong u = (ulong)each[0];
				float f = (float)each[1];
				Assert.AreEqual<ulong>(u, uints[i]);
				Assert.AreEqual<float>(f, floats[i]);
			}
		}

		[TestMethod]
		public void TestSubArray() {
			Format format = new Format("");
		}
	}
}
