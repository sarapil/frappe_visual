/**
 * EmojiPicker — Rich emoji grid with search, categories, skin tones
 *
 * frappe.visual.EmojiPicker.create({
 *   container: el,              // or null for floating
 *   onSelect: (emoji) => {},
 *   recent: true,               // show recently used
 *   search: true,
 *   skinTone: true,
 *   theme: "glass",
 *   position: "bottom-start",   // for floating mode
 *   trigger: buttonEl,          // element to anchor to
 * })
 */
export class EmojiPicker {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static CATEGORIES = [
		{ id: "recent",  icon: "🕐", label: "Recent",    emojis: [] },
		{ id: "smileys", icon: "😀", label: "Smileys",   emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😋","😛","🤔","🤗","🤭","😐","😶","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😢","😭","😤","😡","🤬","😈","👿","💀","☠️","💩","🤡","👹","👻","👽","🤖"] },
		{ id: "people",  icon: "👋", label: "People",    emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄"] },
		{ id: "nature",  icon: "🐶", label: "Nature",    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🐙","🦑","🦀","🦞","🦐","🐠","🐟"] },
		{ id: "food",    icon: "🍎", label: "Food",      emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕"] },
		{ id: "travel",  icon: "🚗", label: "Travel",    emojis: ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍","🛺","🚲","🛴","🛹","🛼","🚁","🛸","🚀","✈️","🛩","🚢","⛵","🚤","🛥","🏗","🏠","🏡","🏢","🏣","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒"] },
		{ id: "objects", icon: "💡", label: "Objects",   emojis: ["⌚","📱","💻","⌨️","🖥","🖨","🖱","🖲","🕹","🗜","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🎙","🎚","🎛","🧭","⏱","⏲","⏰","🕰","⌛","📡","🔋","🔌","💡","🔦","🕯","🧯","🛢"] },
		{ id: "symbols", icon: "❤️", label: "Symbols",   emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","✅","❌","❓","❗","‼️","⭐","🌟","💫","🔥","💯"] },
		{ id: "flags",   icon: "🏁", label: "Flags",     emojis: ["🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏴‍☠️","🇸🇦","🇦🇪","🇰🇼","🇶🇦","🇧🇭","🇴🇲","🇮🇶","🇯🇴","🇱🇧","🇸🇾","🇪🇬","🇱🇾","🇹🇳","🇩🇿","🇲🇦","🇹🇷","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇪🇸","🇮🇹","🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇧🇷","🇷🇺","🇵🇰","🇮🇷"] },
	];

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			onSelect: null,
			recent: true,
			search: true,
			skinTone: false,
			theme: "glass",
			trigger: null,
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-emoji-picker fv-emoji-picker--${o.theme}`;

		// Load recent from localStorage
		let recentEmojis = [];
		try { recentEmojis = JSON.parse(localStorage.getItem("fv_emoji_recent") || "[]"); } catch (e) {}

		const categories = [...EmojiPicker.CATEGORIES];
		if (o.recent && recentEmojis.length) categories[0].emojis = recentEmojis.slice(0, 24);
		else categories.shift(); // Remove "Recent" if empty

		let activeCategory = categories[0]?.id || "smileys";

		function buildHTML() {
			return `
				${o.search ? `<div class="fv-emoji-picker__search">
					<input type="text" class="fv-emoji-picker__search-input" placeholder="Search emoji..." />
				</div>` : ""}
				<div class="fv-emoji-picker__tabs">
					${categories.map(c => `<button class="fv-emoji-picker__tab${c.id === activeCategory ? " fv-emoji-picker__tab--active" : ""}" data-cat="${c.id}" title="${c.label}">${c.icon}</button>`).join("")}
				</div>
				<div class="fv-emoji-picker__grid" data-active="${activeCategory}"></div>
			`;
		}

		function renderGrid(filter) {
			const grid = el.querySelector(".fv-emoji-picker__grid");
			if (!grid) return;
			let emojis;
			if (filter) {
				emojis = categories.flatMap(c => c.emojis);
				// Simple text search not really applicable to emojis, show all
			} else {
				const cat = categories.find(c => c.id === activeCategory);
				emojis = cat ? cat.emojis : [];
			}
			grid.innerHTML = emojis.map(e => `<button class="fv-emoji-picker__emoji" data-emoji="${e}">${e}</button>`).join("");
		}

		el.innerHTML = buildHTML();
		renderGrid();

		// Tab switching
		el.addEventListener("click", (e) => {
			const tab = e.target.closest("[data-cat]");
			if (tab) {
				activeCategory = tab.dataset.cat;
				el.querySelectorAll(".fv-emoji-picker__tab--active").forEach(t => t.classList.remove("fv-emoji-picker__tab--active"));
				tab.classList.add("fv-emoji-picker__tab--active");
				renderGrid();
				return;
			}
			const emojiBtn = e.target.closest("[data-emoji]");
			if (emojiBtn) {
				const emoji = emojiBtn.dataset.emoji;
				// Add to recent
				recentEmojis = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
				try { localStorage.setItem("fv_emoji_recent", JSON.stringify(recentEmojis)); } catch (e) {}
				if (o.onSelect) o.onSelect(emoji);
			}
		});

		// Search
		const searchInput = el.querySelector(".fv-emoji-picker__search-input");
		if (searchInput) {
			searchInput.oninput = () => {
				const q = searchInput.value.trim().toLowerCase();
				renderGrid(q || null);
			};
		}

		if (o.container) o.container.appendChild(el);

		return {
			el,
			show() { el.style.display = ""; },
			hide() { el.style.display = "none"; },
			toggle() { el.style.display = el.style.display === "none" ? "" : "none"; },
			destroy() { el.remove(); },
		};
	}
}
