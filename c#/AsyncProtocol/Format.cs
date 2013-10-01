using System;
using System.Collections.Generic;

namespace Sitegui.AsyncProtocol {
	/// <summary>
	/// Represent a format with an object tree
	/// </summary>
	class Format {
		/// <summary>
		/// Base class for each element
		/// </summary>
		internal abstract class Element {
			internal enum Type {UINT, INT, FLOAT, TOKEN, STRING, ARRAY};
			internal readonly Type ElementType;
			internal Element(Type type) {
				ElementType = type;
			}
		}

		/// <summary>
		/// Represent each base element (uint, int, float, token and string)
		/// </summary>
		internal class LeafElement : Element {
			internal LeafElement(Type type):base(type) {
				if (type == Element.Type.ARRAY)
					throw new ArgumentException("Invalid element type");
			}
		}

		/// <summary>
		/// Represent an array element
		/// </summary>
		internal class ElementsArray : Element {
			internal readonly List<Element> Elements = new List<Element>();
			internal ElementsArray()
				: base(Element.Type.ARRAY) {
			}
		}

		/// <summary>
		/// The root of the format tree
		/// </summary>
		internal readonly ElementsArray Root = new ElementsArray();

		/// <summary>
		/// The format as a string
		/// </summary>
		internal readonly string FormatString;

		/// <summary>
		/// Create a new Format object from a string
		/// </summary>
		/// <param name="format">The format string</param>
		internal Format(string format) {
			FormatString = format;
			ElementsArray currentLevel = Root;
			Stack<ElementsArray> levels = new Stack<ElementsArray>();

			// Inflate the format
			for (int i = 0; i < format.Length; i++) {
				switch (format[i]) {
					case '(':
						// New level of parentheses
						ElementsArray newLevel = new ElementsArray();
						currentLevel.Elements.Add(newLevel);
						levels.Push(currentLevel);
						currentLevel = newLevel;
						break;
					case ')':
						if (currentLevel == Root)
							// Unbalanced parentheses
							throw new ArgumentException("Invalid format string: " + format);
						currentLevel = levels.Count == 0 ? Root : levels.Pop();
						break;
					case 'u':
						currentLevel.Elements.Add(new LeafElement(Element.Type.UINT));
						break;
					case 'i':
						currentLevel.Elements.Add(new LeafElement(Element.Type.INT));
						break;
					case 'f':
						currentLevel.Elements.Add(new LeafElement(Element.Type.FLOAT));
						break;
					case 't':
						currentLevel.Elements.Add(new LeafElement(Element.Type.TOKEN));
						break;
					case 's':
						currentLevel.Elements.Add(new LeafElement(Element.Type.STRING));
						break;
					default:
						// Invalid character
						throw new ArgumentException("Invalid format string: "+format);
				}
			}

			// Check if the format has balanced parentheses
			if (currentLevel != Root)
				throw new ArgumentException("Invalid format string: " + format);
		}
	}
}
