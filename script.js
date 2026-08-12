const ADMIN_PASSWORD = "kusi1114"; 

function checkPassword() {
  const input = document.getElementById("admin-pass").value;
  if (input === ADMIN_PASSWORD) {
    // 正解ならロック画面を消して、管理画面を表示する
    document.getElementById("lock-screen").style.display = "none";
    // 運営用リストを読み込む
    if (typeof loadProgressLists === "function") loadProgressLists();
  } else {
    alert("パスワードが違います！");
    document.getElementById("admin-pass").value = "";
  }
}
// ここをあなたの GAS の URL に書き換える
const API_URL = "https://script.google.com/macros/s/AKfycbyaIbzsNSW2M2qrSf23ca-OeDzG6nzO36mG2j1aZPnjh6fm95-zY_bXb6INMo07AdMo2g/exec";

// 画面が開かれたときに、自動で適切な初期処理を行う
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("progress-container")) {
    // 💡 修正2：パスワードを入れる前は何も読み込ませない（空っぽにします）
  }
  
  // お客様画面（index.html）を開いた場合
  if (document.getElementById("customer-done-list")) {
    loadCustomerLists(); // 開いた瞬間に即座に1回読み込む！
    setInterval(loadCustomerLists, 10000); // その後は10秒ごとに自動更新
  }
});

//
// 運営側：状態を更新する関数（1〜40限定・全角半角補正・自動クリア・連打防止版）
//
function updateStatus(status) {
  let inputElement = document.getElementById("num");
  let rawValue = inputElement.value;

  // 1. 全角数字を半角数字に自動変換する
  let correctedValue = rawValue.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  // 2. 数字以外の不要な文字（英字、漢字、ひらがな等）をすべて強制的に消去する
  correctedValue = correctedValue.replace(/[^0-9]/g, "");

  // 補正した結果、何も残らなかった（空っぽ）の場合は処理を中断する
  if (!correctedValue) {
    alert("有効な「数字（番号）」を入力してください");
    inputElement.value = ""; // 入力欄をクリア
    return;
  }

  // 実際に処理で使うID（補正後の数字）
  const id = Number(correctedValue);

  // 💡 【追加機能】1から40以外の数字を完全に弾くガードレール
  if (id < 1 || id > 40) {
    alert("エラー：番号は 1番 から 40番 の間で入力してください！");
    inputElement.value = ""; // 入力欄をクリア
    return; // ここで処理を終了し、GASへの送信をストップします
  }

  // 3. 連打防止のためにボタンを無効化
  const buttons = document.querySelectorAll("button");
  buttons.forEach(btn => btn.disabled = true);

  // 【超高速化】Googleの返事を待たずに、今押した番号を即座に画面のリストに移動させる
  const makingList = document.getElementById("making-list");
  const doneList = document.getElementById("done-list");
  
  // 既存のリストから、今から更新するIDの古い表示を一度消す
  document.querySelectorAll("#progress-container li").forEach(li => {
    if (li.innerText === `番号 【${id}】`) li.remove();
  });

  // 新しいリストへ即座に追加
  const newLi = document.createElement("li");
  newLi.innerText = `番号 【${id}】`;
  
  if (status === "making") {
    makingList.appendChild(newLi);
  } else if (status === "done") {
    doneList.appendChild(newLi);
  }

  // 正しく実行が開始されたので、入力欄を一瞬で空（リセット）にする
  inputElement.value = "";

  // 4. 裏側で静かにGoogle Apps Scriptへデータを送る
  const form = new URLSearchParams();
  form.append("id", id);
  form.append("status", status);

  fetch(API_URL, {
    method: "POST",
    body: form
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(`エラーが発生しました: ${data.error}`);
      loadProgressLists();
    }
  })
  .catch(error => {
    console.error("通信エラー:", error);
    alert("通信に失敗しました。");
    loadProgressLists();
  })
  .finally(() => {
    // 通信が終わったらボタンをすぐ使えるように戻す
    buttons.forEach(btn => btn.disabled = false);
  });
}

//
// 運営側：現在進行中の番号リストを読み込んで表示する関数（クリア強化版）
//
function loadProgressLists() {
  const makingList = document.getElementById("making-list");
  const doneList = document.getElementById("done-list");
  
  if (!makingList || !doneList) return;

  // 💡 リストの中身だけでなく、残ってしまったゴミ要素も完全に全消しする
  makingList.innerHTML = "";
  doneList.innerHTML = "";

  fetch(`${API_URL}?all=true`)
    .then(res => res.json())
    .then(data => {
      if (data.error || !Array.isArray(data)) {
        console.error("リスト読み込みエラー:", data.error);
        return;
      }

      data.forEach(item => {
        if (!item || !item.id) return; // 空データ対策

        const li = document.createElement("li");
        li.innerText = `番号 【${item.id}】`;

        if (item.status === "making") {
          makingList.appendChild(li);
        } else if (item.status === "done") {
          doneList.appendChild(li);
        }
      });
    })
    .catch(err => {
      console.error("リスト同期エラー:", err);
    });
}

//
// お客様側：現在進行中の番号リストを読み込んで表示する関数（くるくるスピナー連動版）
//
function loadCustomerLists() {
  const refreshBtn = document.getElementById("refresh-btn");
  const spinner = document.getElementById("loading-spinner");
  const doneList = document.getElementById("customer-done-list");
  const makingList = document.getElementById("customer-making-list");

  // 1. ボタンを「更新中...」にして無効化し、くるくるを表示する
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerText = "🔄 更新中...";
  }
  if (spinner) {
    spinner.style.display = "block"; // 💡 くるくるを表示！
  }

  // 読み込み中であることを伝えるため一瞬だけ薄くする
  doneList.style.opacity = "0.5";
  makingList.style.opacity = "0.5";

  fetch(`${API_URL}?all=true`)
    .then(res => {
      if (!res.ok) throw new Error("ネットワークエラー");
      return res.json();
    })
    .then(data => {
      if (data.error || !Array.isArray(data)) {
        console.error("GASからのエラー:", data.error);
        return;
      }

      doneList.innerHTML = "";
      makingList.innerHTML = "";

      data.forEach(item => {
        if (!item || !item.id) return;

        const li = document.createElement("li");
        li.innerText = item.id;

        if (item.status === "done") {
          li.style.border = "2px solid #00cc66";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "white";
          doneList.appendChild(li);
        } else if (item.status === "making") {
          li.style.border = "2px solid #ff9900";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "#fff9f0"; 
          makingList.appendChild(li);
        }
      });
    })
    .catch(err => {
      // 404エラーは無視
    })
    .finally(() => {
      // 2. 通信が終わったらリストを明るくし、くるくるを非表示にする
      doneList.style.opacity = "1";
      makingList.style.opacity = "1";

      if (spinner) {
        spinner.style.display = "none"; // 💡 くるくるを消す！
      }
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerText = "🔄 今すぐ更新する";
      }
    });
}