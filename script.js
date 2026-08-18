// 【重要】ここにあなたの最新の GAS ウェブアプリ URL を貼り付けてください
const API_URL = "https://script.google.com/macros/s/AKfycbwBCl08U2-km97ObWfRmqZ6vioS2Y7kVEHF9TtSknmPK1_csWJypwunfKyTIchuzqXPUg/exec";
const ADMIN_PASSWORD = "kusi1114"; 

// 順番待ち（キュー）のための配列と状態管理
let requestQueue = [];
let isProcessingQueue = false;

// 運営側の「同期ボタン」用に、直前のリストの中身（テキスト）を記憶する変数
let lastProgressDataString = "";

function checkPassword() {
  const input = document.getElementById("admin-pass").value;
  if (input === ADMIN_PASSWORD) {
    document.getElementById("lock-screen").style.display = "none";
    if (typeof loadProgressLists === "function") loadProgressLists();
  } else {
    alert("パスワードが違います！");
    document.getElementById("admin-pass").value = "";
  }
}

// 画面が開かれたときの初期処理
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("customer-done-list")) {
    loadCustomerLists(false);
    setInterval(() => { loadCustomerLists(false); }, 6000); 
  }
});

// 💡【新機能】オリジナルテンキーのボタンが押されたときに動く関数
function pressKey(key) {
  let inputElement = document.getElementById("num");
  if (!inputElement) return;

  if (key === "AC") {
    // すべて消去
    inputElement.value = "";
  } else if (key === "⌫") {
    // 1文字消去
    inputElement.value = inputElement.value.slice(0, -1);
  } else {
    // 桁あふれ防止（文化祭の番号は最大2桁なので、3桁以上は入力させない）
    if (inputElement.value.length >= 2) return;
    
    // 数字を末尾に追加
    inputElement.value += key;
  }
}

// 運営側：状態を更新する関数（テンキー入力最適化版）
function updateStatus(status) {
  let inputElement = document.getElementById("num");
  let rawValue = inputElement.value;

  // テンキー入力のため不要な全角補正などは削除し、超軽量化
  if (!rawValue) {
    alert("有効な「数字（番号）」を入力してください");
    return;
  }

  const id = Number(rawValue);

  // 1から40以外の数字を弾く（40番まで制限）
  if (id < 1 || id > 40) {
    alert("エラー：番号は 1番 から 40番 の間で入力してください！");
    inputElement.value = ""; // 入力欄をクリア
    return;
  }

  const isDuplicate = requestQueue.some(req => req.id === id && req.status === status);
  if (isDuplicate) return;

  // ボタンを押した瞬間に画面の文字をクリア（次の入力へ）
  inputElement.value = "";

  const uniqueId = "req-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  addWaitingLogMessage(uniqueId, id, status);
  requestQueue.push({ uniqueId: uniqueId, id: id, status: status });
  processNextRequest();
}

// 裏側でデータを順番待ちさせて送る関数
function processNextRequest() {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;
  const currentRequest = requestQueue.shift();
  updateLogToProcessing(currentRequest.uniqueId);

  const form = new URLSearchParams();
  form.append("id", currentRequest.id);
  form.append("status", currentRequest.status);

  fetch(API_URL, {
    method: "POST",
    body: form
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(`エラーが発生しました: ${data.error}`);
      return;
    }

    if (data.changed === false) {
      updateLogToAlreadyLatest(currentRequest.uniqueId, currentRequest.id, currentRequest.status);
    } else {
      updateLogToSuccess(currentRequest.uniqueId, currentRequest.id, currentRequest.status);
    }

    loadProgressLists(false); 
  })
  .catch(error => {
    console.error("通信エラー:", error);
    updateLogToFailure(currentRequest.uniqueId, currentRequest.id);
    loadProgressLists(false);
  })
  .finally(() => {
    setTimeout(() => {
      isProcessingQueue = false;
      processNextRequest(); 
    }, 500);
  });
}

// 運営側：ログ追加・書き換え関数群
function addWaitingLogMessage(uniqueId, id, status) {
  const container = document.getElementById("action-log-container");
  if (!container) return;
  let statusText = status === "making" ? "製作中" : status === "done" ? "完成" : "お渡し";
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const logItem = document.createElement("div");
  logItem.id = uniqueId;
  logItem.style.padding = "6px 10px";
  logItem.style.backgroundColor = "#fff";
  logItem.style.borderLeft = "4px solid #6c757d";
  logItem.style.borderRadius = "4px";
  logItem.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
  logItem.innerHTML = `<span style="color:#aaa; font-size:0.85rem; margin-right:8px;">[${timeStr}]</span> <strong>【${id}番】</strong> を ${statusText} へ <span style="color:#6c757d; font-weight:bold;">⌛ 待機中...</span>`;
  container.insertBefore(logItem, container.firstChild);
  if (container.children.length > 5) container.lastChild.remove();
}
function updateLogToProcessing(uniqueId) {
  const logItem = document.getElementById(uniqueId);
  if (!logItem) return;
  logItem.style.borderLeft = "4px solid #ffc107";
  logItem.innerHTML = logItem.innerHTML.replace("⌛ 待機中...", "<span style='color:#ffc107; font-weight:bold;'>🔄 更新中...</span>");
}
function updateLogToSuccess(uniqueId, id, status) {
  const logItem = document.getElementById(uniqueId);
  if (!logItem) return;
  let statusText = status === "making" ? "製作中" : status === "done" ? "完成" : "お渡し";
  let statusColor = status === "making" ? "#ff9900" : status === "done" ? "#00cc66" : "#666";
  const now = new Date();
  const formattedDate = `${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  logItem.style.borderLeft = `4px solid ${statusColor}`;
  logItem.innerHTML = `<span style="color:#aaa; font-size:0.85rem; margin-right:8px;">[${formattedDate}]</span> <strong>【${id}番】</strong> を <span style="color:${statusColor}; font-weight:bold;">${statusText}状態へ完了</span>`;
}
function updateLogToAlreadyLatest(uniqueId, id, status) {
  const logItem = document.getElementById(uniqueId);
  if (!logItem) return;
  let statusText = status === "making" ? "製作中" : status === "done" ? "完成" : "お渡し";
  const now = new Date();
  const formattedDate = `${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  logItem.style.borderLeft = "4px solid #adb5bd"; 
  logItem.innerHTML = `<span style="color:#aaa; font-size:0.85rem; margin-right:8px;">[${formattedDate}]</span> <strong>【${id}番】</strong> はすでに <span style="color:#6c757d; font-weight:bold;">${statusText}</span> です（変更なし）`;
}
function updateLogToFailure(uniqueId, id) {
  const logItem = document.getElementById(uniqueId);
  if (!logItem) return;
  logItem.style.borderLeft = "4px solid #dc3545";
  logItem.innerHTML = `<span style="color:#dc3545; font-weight:bold;">⚠️ 【${id}番】 の通信に失敗しました</span>`;
}

function addSyncLogMessage(isChanged) {
  const container = document.getElementById("action-log-container");
  if (!container) return;
  const now = new Date();
  const formattedDate = `${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const logItem = document.createElement("div");
  logItem.style.padding = "6px 10px";
  logItem.style.backgroundColor = "#f0f8ff"; 
  logItem.style.borderLeft = isChanged ? "4px solid #007bff" : "4px solid #17a2b8";
  logItem.style.borderRadius = "4px";
  logItem.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
  logItem.innerHTML = isChanged ? 
    `<span style="color:#aaa; font-size:0.85rem; margin-right:8px;">[${formattedDate}]</span> 🔄 <span style="color:#007bff; font-weight:bold;">リストを最新情報へ同期完了！</span>` :
    `<span style="color:#aaa; font-size:0.85rem; margin-right:8px;">[${formattedDate}]</span> ✨ <span style="color:#17a2b8; font-weight:bold;">リストはすでに最新状態です</span>`;
  container.insertBefore(logItem, container.firstChild);
  if (container.children.length > 5) container.lastChild.remove();
}

// 運営側：現在進行中の番号リストを読み込んで表示する関数
function loadProgressLists(isManualClick = true) {
  const makingList = document.getElementById("making-list");
  const doneList = document.getElementById("done-list");
  if (!makingList || !doneList) return;

  fetch(`${API_URL}?all=true`)
    .then(res => res.json())
    .then(data => {
      const currentDataString = JSON.stringify(data);
      let hasChanges = (currentDataString !== lastProgressDataString);
      lastProgressDataString = currentDataString;

      makingList.innerHTML = "";
      doneList.innerHTML = "";

      if (data.error || (!data.making && !data.done)) {
        makingList.innerHTML = "<span style='color:#aaa; font-size:0.9rem; font-weight:normal;'>現在、製作中の注文はありません</span>";
        doneList.innerHTML = "<span style='color:#aaa; font-size:0.9rem; font-weight:normal;'>現在、お呼び出し中の注文はありません</span>";
        if (isManualClick) addSyncLogMessage(hasChanges);
        return;
      }

      if (data.making) {
        data.making.split(",").forEach(id => {
          const li = document.createElement("li");
          li.innerText = `番号 【${id}】`;
          makingList.appendChild(li);
        });
      } else {
        makingList.innerHTML = "<span style='color:#aaa; font-size:0.9rem; font-weight:normal;'>現在、製作中の注文はありません</span>";
      }

      if (data.done) {
        data.done.split(",").forEach(id => {
          const li = document.createElement("li");
          li.innerText = `番号 【${id}】`;
          doneList.appendChild(li);
        });
      } else {
        doneList.innerHTML = "<span style='color:#aaa; font-size:0.9rem; font-weight:normal;'>現在、お呼び出し中の注文はありません</span>";
      }

      if (isManualClick) addSyncLogMessage(hasChanges);
    })
    .catch(err => {
      console.error("リスト同期エラー:", err);
    });
}

// お客様側：現在進行中の番号リストを読み込んで表示する関数
function loadCustomerLists(showSpinner) {
  const refreshBtn = document.getElementById("refresh-btn");
  const spinner = document.getElementById("loading-spinner");
  const doneList = document.getElementById("customer-done-list");
  const makingList = document.getElementById("customer-making-list");

  if (showSpinner) {
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerText = "🔄 更新中...";
    }
    if (spinner) spinner.style.display = "block";
    doneList.style.opacity = "0.5";
    makingList.style.opacity = "0.5";
  }

  fetch(`${API_URL}?all=true`)
    .then(res => {
      if (!res.ok) throw new Error("ネットワークエラー");
      return res.json();
    })
    .then(data => {
      doneList.innerHTML = "";
      makingList.innerHTML = "";

      if (data.error) return;

      // 超軽量テキスト（カンマ区切り）を綺麗に分解して枠付きリストを復元
      if (data.done) {
        data.done.split(",").forEach(id => {
          const li = document.createElement("li");
          li.innerText = id;
          li.style.border = "2px solid #00cc66";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "white";
          doneList.appendChild(li);
        });
      } else {
        doneList.innerHTML = "<span style='color:#aaa; font-size:1rem; font-weight:normal; width:100%; margin:10px 0;'>ただいまお呼び出し中の番号はありません</span>";
      }

      if (data.making) {
        data.making.split(",").forEach(id => {
          const li = document.createElement("li");
          li.innerText = id;
          li.style.border = "2px solid #ff9900";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "#fff9f0"; 
          makingList.appendChild(li);
        });
      } else {
        makingList.innerHTML = "<span style='color:#aaa; font-size:1rem; font-weight:normal; width:100%; margin:10px 0;'>ただいま製作中の注文はありません</span>";
      }
    })
    .catch(err => {
      // 404エラー等は自動リトライされるため無視
    })
    .finally(() => {
      doneList.style.opacity = "1";
      makingList.style.opacity = "1";
      if (spinner) spinner.style.display = "none";
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerText = "🔄 今すぐ更新する";
      }
    });
}