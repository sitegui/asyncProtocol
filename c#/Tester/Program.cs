using Sitegui.AsyncProtocol;
using System;

namespace Sitegui {
	class Program {
		static void Main() {

			uint E_DIV_ZERO = Registry.RegisterException(1);

			uint CC_ADD = Registry.RegisterClientCall(1, "ii", "i");
			uint CC_DIV = Registry.RegisterClientCall(2, "uu", "f", new uint[] { E_DIV_ZERO });
			uint CC_CONCAT = Registry.RegisterClientCall(3, "(s)", "s");

			// Connect
			Connection conn = new Connection("localhost", 8001);

			conn.OnOpen += delegate {
				Console.WriteLine("Connected");

				// Send simple request
				DataArray pack = new DataArray("s");
				pack.AddData(new Data("One"));
				pack.AddData(new Data("Two"));
				pack.AddData(new Data("áçêñtòs\u26C4"));
				conn.SendCall(CC_CONCAT, new Data().AddDataArray(pack), delegate(Connection _, object data) {
					Console.WriteLine((string)data == "One + Two + áçêñtòs⛄");
					conn.End();
				});
			};

			conn.OnClose += delegate {
				Console.WriteLine("Closed");
			};

			Console.Read();
		}
	}
}
