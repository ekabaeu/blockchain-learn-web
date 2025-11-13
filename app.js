// ================== DATE & TIME ==================
function updateDateTime() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const dtEl = document.getElementById("datetime");
  if (dtEl) {
    dtEl.textContent = `${dayName}, ${date} ${month} ${year} (${hh}:${mm}:${ss} WIB)`;
  }
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ================== SHA-256 ==================
async function sha256(msg) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ================== NAVIGATION ==================
const ACTIVE_TAB_CLASSES = [
  "bg-slate-800",
  "text-white",
  "shadow-inner",
  "shadow-emerald-500/20",
];
const INACTIVE_TAB_CLASS = "text-slate-300";
const pages = Array.from(document.querySelectorAll("[data-page]"));
const tabs = Array.from(document.querySelectorAll("[data-tab]"));

function setTabActive(tabEl, isActive) {
  if (!tabEl) return;
  if (isActive) {
    tabEl.classList.add(...ACTIVE_TAB_CLASSES);
    tabEl.classList.remove(INACTIVE_TAB_CLASS);
    tabEl.setAttribute("aria-selected", "true");
  } else {
    tabEl.classList.remove(...ACTIVE_TAB_CLASSES);
    if (!tabEl.classList.contains(INACTIVE_TAB_CLASS)) {
      tabEl.classList.add(INACTIVE_TAB_CLASS);
    }
    tabEl.setAttribute("aria-selected", "false");
  }
}

function showPage(pageId) {
  pages.forEach((page) => {
    page.classList.add("hidden");
    page.setAttribute("aria-hidden", "true");
  });
  tabs.forEach((tab) => setTabActive(tab, false));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove("hidden");
    targetPage.setAttribute("aria-hidden", "false");
  }

  const tabId = "tab-" + pageId.replace("page-", "");
  const targetTab = document.getElementById(tabId);
  setTabActive(targetTab, true);
}

["home", "hash", "block", "chain", "ecc", "consensus", "about"].forEach(
  (pageKey) => {
    const tabButton = document.getElementById("tab-" + pageKey);
    if (!tabButton) return;
    tabButton.addEventListener("click", () => showPage("page-" + pageKey));
    tabButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showPage("page-" + pageKey);
      }
    });
  }
);

showPage("page-home");

// ================== HASH PAGE ==================
const hashInput = document.getElementById("hash-input");
if (hashInput) {
  hashInput.addEventListener("input", async (e) => {
    const out = document.getElementById("hash-output");
    if (!out) return;
    out.textContent = await sha256(e.target.value);
  });
}

// ================== BLOCK PAGE ==================
const blockData = document.getElementById("block-data");
const blockNonce = document.getElementById("block-nonce");
const blockHash = document.getElementById("block-hash");
const blockTimestamp = document.getElementById("block-timestamp");
const speedControl = document.getElementById("speed-control");

if (blockNonce && blockData) {
  blockNonce.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
    updateBlockHash();
  });
  blockData.addEventListener("input", updateBlockHash);
}

async function updateBlockHash() {
  if (!blockData || !blockNonce || !blockHash) return;
  const data = blockData.value;
  const nonce = blockNonce.value || "0";
  blockHash.textContent = await sha256(data + nonce);
}

const btnMine = document.getElementById("btn-mine");
if (btnMine) btnMine.addEventListener("click", async () => {
  const data = blockData.value;
  const speedMultiplier = parseInt(speedControl.value) || 1;
  const baseBatch = 1000;
  const batchSize = baseBatch * speedMultiplier;
  const difficulty = "0000";
  const status = document.getElementById("mining-status");
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });
  blockTimestamp.value = timestamp;
  blockHash.textContent = "";
  blockNonce.value = "0";
  let nonce = 0;
  if (status) status.textContent = "Mining...";
  async function mineStep() {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
      promises.push(sha256(data + timestamp + (nonce + i)));
    }
    const results = await Promise.all(promises);
    for (let i = 0; i < results.length; i++) {
      const h = results[i];
      if (h.startsWith(difficulty)) {
        blockNonce.value = nonce + i;
        blockHash.textContent = h;
        if (status)
          status.textContent = `Mining selesai (Nonce=${nonce + i})`;
        return;
      }
    }
    nonce += batchSize;
    blockNonce.value = nonce;
    if (status) status.textContent = `Mining... Nonce=${nonce}`;
    setTimeout(mineStep, 0);
  }
  mineStep();
});

// ================== BLOCKCHAIN PAGE ==================
const ZERO_HASH = "0".repeat(64);
let blocks = [];
const chainDiv = document.getElementById("blockchain");

function renderChain() {
  chainDiv.innerHTML = "";
  blocks.forEach((blk, i) => {
    const div = document.createElement("div");
    div.className =
      "blockchain-block space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/40";
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">Block #${blk.index}</h3>
        <button
          onclick="mineChainBlock(${i})"
          class="mine rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-emerald-500"
          type="button"
          aria-label="Mining blok indeks ${blk.index}"
        >
          Mine
        </button>
      </div>
      <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Previous Hash
        <div class="output rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono text-xs text-emerald-300 shadow-inner shadow-slate-900">${blk.previousHash}</div>
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Data
        <textarea
          rows="2"
          onchange="onChainDataChange(${i},this.value)"
          class="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 shadow-inner shadow-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Ubah data untuk block ${blk.index}"
        >${blk.data}</textarea>
      </label>
      <div
        id="status-${i}"
        class="status rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
        aria-live="polite"
      ></div>
      <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Timestamp
        <div
          id="timestamp-${i}"
          class="output rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono text-xs text-slate-200 shadow-inner shadow-slate-900"
        >${blk.timestamp}</div>
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Nonce
        <div
          id="nonce-${i}"
          class="output rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono text-xs text-slate-200 shadow-inner shadow-slate-900"
        >${blk.nonce}</div>
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Hash
        <div
          id="hash-${i}"
          class="output rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono text-xs text-emerald-300 shadow-inner shadow-slate-900 break-all"
        >${blk.hash}</div>
      </label>`;
    chainDiv.appendChild(div);
  });
}
function addChainBlock() {
  const idx = blocks.length;
  const prev = idx ? blocks[idx - 1].hash : ZERO_HASH;
  const blk = {
    index: idx,
    data: "",
    previousHash: prev,
    timestamp: "",
    nonce: 0,
    hash: "",
  };
  blocks.push(blk);
  renderChain();
}
window.onChainDataChange = function (i, val) {
  blocks[i].data = val;
  blocks[i].nonce = 0;
  blocks[i].timestamp = "";
  blocks[i].hash = "";
  for (let j = i + 1; j < blocks.length; j++) {
    blocks[j].previousHash = blocks[j - 1].hash;
    blocks[j].nonce = 0;
    blocks[j].timestamp = "";
    blocks[j].hash = "";
  }
  renderChain();
};
window.mineChainBlock = function (i) {
  const blk = blocks[i];
  const prev = blk.previousHash;
  const data = blk.data;
  const difficulty = "0000";
  const batchSize = 1000 * 50;
  blk.nonce = 0;
  blk.timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });
  const t0 = performance.now();
  const status = document.getElementById(`status-${i}`);
  const ndiv = document.getElementById(`nonce-${i}`);
  const hdiv = document.getElementById(`hash-${i}`);
  const tdiv = document.getElementById(`timestamp-${i}`);
  status.textContent = "Proses mining...";
  async function step() {
    const promises = [];
    for (let j = 0; j < batchSize; j++)
      promises.push(sha256(prev + data + blk.timestamp + (blk.nonce + j)));
    const results = await Promise.all(promises);
    for (let j = 0; j < results.length; j++) {
      const h = results[j];
      if (h.startsWith(difficulty)) {
        blk.nonce += j;
        blk.hash = h;
        ndiv.textContent = blk.nonce;
        hdiv.textContent = h;
        tdiv.textContent = blk.timestamp;
        const dur = ((performance.now() - t0) / 1000).toFixed(3);
        status.textContent = `Mining selesai (${dur}s)`;
        return;
      }
    }
    blk.nonce += batchSize;
    ndiv.textContent = blk.nonce;
    setTimeout(step, 0);
  }
  step();
};
const btnAddBlock = document.getElementById("btn-add-block");
if (btnAddBlock) {
  btnAddBlock.onclick = addChainBlock;
  addChainBlock();
}

// ================== ECC DIGITAL SIGNATURE ==================
const ec = new elliptic.ec("secp256k1");
const eccPrivate = document.getElementById("ecc-private");
const eccPublic = document.getElementById("ecc-public");
const eccMessage = document.getElementById("ecc-message");
const eccSignature = document.getElementById("ecc-signature");
const eccVerifyResult = document.getElementById("ecc-verify-result");
function randomPrivateHex() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function normHex(h) {
  if (!h) return "";
  return h.toLowerCase().replace(/^0x/, "");
}
const btnGen = document.getElementById("btn-generate-key");
if (btnGen && eccPrivate && eccPublic && eccSignature && eccVerifyResult) {
  btnGen.onclick = () => {
    const priv = randomPrivateHex();
    const key = ec.keyFromPrivate(priv, "hex");
    const pub =
      "04" +
      key.getPublic().getX().toString("hex").padStart(64, "0") +
      key.getPublic().getY().toString("hex").padStart(64, "0");
    eccPrivate.value = priv;
    eccPublic.value = pub;
    eccSignature.value = "";
    eccVerifyResult.textContent = "";
  };
}
const btnSign = document.getElementById("btn-sign");
if (btnSign && eccMessage && eccPrivate && eccSignature && eccVerifyResult) {
  btnSign.onclick = async () => {
    const msg = eccMessage.value;
    if (!msg) {
      alert("Isi pesan!");
      return;
    }
    const priv = normHex(eccPrivate.value.trim());
    if (!priv) {
      alert("Private key kosong!");
      return;
    }
    const hash = await sha256(msg);
    const sig = ec
      .keyFromPrivate(priv, "hex")
      .sign(hash, { canonical: true })
      .toDER("hex");
    eccSignature.value = sig;
    eccVerifyResult.textContent = "";
  };
}
const btnVerify = document.getElementById("btn-verify");
if (btnVerify && eccMessage && eccSignature && eccPublic && eccVerifyResult) {
  btnVerify.onclick = async () => {
    try {
      const msg = eccMessage.value,
        sig = normHex(eccSignature.value.trim()),
        pub = normHex(eccPublic.value.trim());
      if (!msg || !sig || !pub) {
        alert("Lengkapi semua field!");
        return;
      }
      const key = ec.keyFromPublic(pub, "hex");
      const valid = key.verify(await sha256(msg), sig);
      eccVerifyResult.textContent = valid
        ? "Signature VALID!"
        : "Signature TIDAK valid!";
    } catch (e) {
      eccVerifyResult.textContent = "Error verifikasi";
    }
  };
}

// ================== KONSENSUS PAGE ==================
const ZERO = "0".repeat(64);
let balances = { A: 100, B: 100, C: 100 };
let txPool = [];
let chainsConsensus = { A: [], B: [], C: [] };

function updateBalancesDOM() {
  ["A", "B", "C"].forEach((u) => {
    const el = document.getElementById("saldo-" + u);
    if (el) el.textContent = balances[u];
  });
}
function parseTx(line) {
  const m = line.match(/^([A-C])\s*->\s*([A-C])\s*:\s*(\d+)$/);
  if (!m) return null;
  return { from: m[1], to: m[2], amt: parseInt(m[3]) };
}

// ======== Mining Helper ========
async function shaMine(prev, data, timestamp) {
  const diff = "000";
  const base = 1000;
  const batch = base * 50;
  return new Promise((resolve) => {
    let nonce = 0;
    async function loop() {
      const promises = [];
      for (let i = 0; i < batch; i++)
        promises.push(sha256(prev + data + timestamp + (nonce + i)));
      const results = await Promise.all(promises);
      for (let i = 0; i < results.length; i++) {
        const h = results[i];
        if (h.startsWith(diff)) {
          resolve({ nonce: nonce + i, hash: h });
          return;
        }
      }
      nonce += batch;
      setTimeout(loop, 0);
    }
    loop();
  });
}

// ======== Genesis dengan mining ========
async function createGenesisConsensus() {
  const diff = "000";
  const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  for (let u of ["A", "B", "C"]) {
    let nonce = 0;
    let found = "";
    while (true) {
      const h = await sha256(ZERO + "Genesis" + ts + nonce);
      if (h.startsWith(diff)) {
        found = h;
        break;
      }
      nonce++;
    }
    chainsConsensus[u] = [
      {
        index: 0,
        prev: ZERO,
        data: "Genesis Block: 100 coins",
        timestamp: ts,
        nonce,
        hash: found,
        invalid: false,
      },
    ];
  }
  renderConsensusChains();
  updateBalancesDOM();
}
if (document.getElementById("chains")) {
  createGenesisConsensus();
}

// ======== Render Konsensus Chain ========
function renderConsensusChains() {
  ["A", "B", "C"].forEach((u) => {
    const cont = document.getElementById("chain-" + u);
    if (!cont) return;
    cont.innerHTML = "";
    chainsConsensus[u].forEach((blk, i) => {
      const d = document.createElement("div");
      const baseClasses =
        "chain-block space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner shadow-slate-950/40 transition-colors";
      const invalidClasses =
        " border-red-500/70 bg-red-900/40 ring-2 ring-red-500/60";
      d.className = `${baseClasses}${blk.invalid ? invalidClasses : ""}`;
      d.setAttribute("aria-invalid", blk.invalid ? "true" : "false");
      d.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-white">Block #${blk.index}</span>
          <span class="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">Node ${u}</span>
        </div>
        <label class="flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          Prev
          <input
            class="small rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-200 shadow-inner shadow-slate-900 focus-visible:outline-none"
            value="${blk.prev}"
            readonly
          >
        </label>
        <label class="flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          Data
          <textarea
            class="data rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-100 shadow-inner shadow-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            rows="3"
            aria-label="Data block ${blk.index} milik user ${u}"
          >${blk.data}</textarea>
        </label>
        <label class="flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          Timestamp
          <input
            class="small rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-200 shadow-inner shadow-slate-900 focus-visible:outline-none"
            value="${blk.timestamp}"
            readonly
          >
        </label>
        <label class="flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          Nonce
          <input
            class="small rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-200 shadow-inner shadow-slate-900 focus-visible:outline-none"
            value="${blk.nonce}"
            readonly
          >
        </label>
        <label class="flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          Hash
          <input
            class="small rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-xs text-emerald-300 shadow-inner shadow-slate-900 focus-visible:outline-none"
            value="${blk.hash}"
            readonly
          >
        </label>`;

      // Attach listener: update data in model when user types,
      // BUT DO NOT set blk.invalid = true here.
      const ta = d.querySelector("textarea.data");
      ta.addEventListener("input", (e) => {
        chainsConsensus[u][i].data = e.target.value;
        // intentionally do NOT mark blk.invalid here.
        // Verification should be performed only when user clicks "Verify".
      });

      cont.appendChild(d);
    });
  });
}

// ======== Kirim Transaksi ========
["A", "B", "C"].forEach((u) => {
  const btn = document.getElementById("send-" + u);
  if (!btn) return;
  btn.onclick = () => {
    const amountEl = document.getElementById("amount-" + u);
    const receiverEl = document.getElementById("receiver-" + u);
    const mempoolEl = document.getElementById("mempool");
    if (!amountEl || !receiverEl || !mempoolEl) return;
    const amt = parseInt(amountEl.value);
    const to = receiverEl.value;
    if (amt <= 0) {
      alert("Jumlah > 0");
      return;
    }
    if (balances[u] < amt) {
      alert("Saldo tidak cukup");
      return;
    }
    const tx = `${u} -> ${to} : ${amt}`;
    txPool.push(tx);
    mempoolEl.value = txPool.join("\n");
  };
});

// ======== Mine Semua Transaksi ========
const btnMineAll = document.getElementById("btn-mine-all");
if (btnMineAll) btnMineAll.onclick = async () => {
  if (txPool.length === 0) {
    alert("Tidak ada transaksi.");
    return;
  }
  const parsed = [];
  for (const t of txPool) {
    const tx = parseTx(t);
    if (!tx) {
      alert("Format salah: " + t);
      return;
    }
    parsed.push(tx);
  }
  const tmp = { ...balances };
  for (const tx of parsed) {
    if (tmp[tx.from] < tx.amt) {
      alert("Saldo " + tx.from + " tidak cukup.");
      return;
    }
    tmp[tx.from] -= tx.amt;
    tmp[tx.to] += tx.amt;
  }
  const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const data = txPool.join(" | ");
  const mining = ["A", "B", "C"].map(async (u) => {
    const prev = chainsConsensus[u].at(-1).hash;
    const r = await shaMine(prev, data, ts);
    chainsConsensus[u].push({
      index: chainsConsensus[u].length,
      prev,
      data,
      timestamp: ts,
      nonce: r.nonce,
      hash: r.hash,
      invalid: false,
    });
  });
  await Promise.all(mining);
  balances = tmp;
  updateBalancesDOM();
  txPool = [];
  document.getElementById("mempool").value = "";
  renderConsensusChains();
  alert("Mining selesai (50× lebih cepat).");
};

// ======== Tombol VERIFY Konsensus ========
const btnVerifyConsensus = document.getElementById("btn-verify-consensus");
if (btnVerifyConsensus) btnVerifyConsensus.onclick = () => {
  try {
    const perIndex = new Map();
    const nodes = ["A", "B", "C"];

    nodes.forEach((node) => {
      chainsConsensus[node].forEach((blk, index) => {
        if (!perIndex.has(index)) perIndex.set(index, []);
        perIndex.get(index).push({ node, blk });
      });
    });

    perIndex.forEach((entries) => {
      if (!entries.length) return;
      const freq = {};
      let majorityData = entries[0].blk.data;
      let maxCount = 0;

      entries.forEach(({ blk }) => {
        const dataKey = blk.data;
        freq[dataKey] = (freq[dataKey] || 0) + 1;
        if (freq[dataKey] > maxCount) {
          maxCount = freq[dataKey];
          majorityData = dataKey;
        }
      });

      entries.forEach(({ blk }) => {
        blk.invalid = blk.data !== majorityData;
      });
    });

    renderConsensusChains();
    alert("Verifikasi selesai — blok dengan data berbeda ditandai merah.");
  } catch (err) {
    console.error("Error saat verifikasi Konsensus:", err);
    alert("Terjadi kesalahan saat verifikasi Konsensus. Cek console.");
  }
};

// ======== Tombol CONSENSUS ========
const btnConsensus = document.getElementById("btn-consensus");
if (btnConsensus) btnConsensus.onclick = async () => {
  try {
    const maxLen = Math.max(
      chainsConsensus.A.length,
      chainsConsensus.B.length,
      chainsConsensus.C.length
    );
    for (let i = 0; i < maxLen; i++) {
      const vals = [];
      for (const u of ["A", "B", "C"])
        if (chainsConsensus[u][i]) vals.push(chainsConsensus[u][i].data);
      if (vals.length === 0) continue;
      const freq = {};
      let maj = vals[0];
      let maxc = 0;
      vals.forEach((v) => {
        freq[v] = (freq[v] || 0) + 1;
        if (freq[v] > maxc) {
          maxc = freq[v];
          maj = v;
        }
      });
      for (const u of ["A", "B", "C"]) {
        if (!chainsConsensus[u][i]) continue;
        const blk = chainsConsensus[u][i];
        blk.data = maj;
        blk.prev = i === 0 ? ZERO : chainsConsensus[u][i - 1].hash;
        blk.hash = await sha256(
          blk.prev + blk.data + blk.timestamp + blk.nonce
        );
        blk.invalid = false;
      }
    }
    renderConsensusChains();
    alert("Konsensus selesai, semua blok diseragamkan.");
  } catch (e) {
    console.error(e);
    alert("Error konsensus.");
  }
};

